import os
import json
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk import transaction

ALGOD_SERVER = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN  = "a" * 64

client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)

def get_deployer():
    mn = os.environ.get("DEPLOYER_MNEMONIC")
    if not mn:
        raise ValueError("Set DEPLOYER_MNEMONIC env variable")
    private_key = mnemonic.to_private_key(mn)
    address     = account.address_from_private_key(private_key)
    return private_key, address

def compile_teal(source):
    result = client.compile(source)
    import base64
    return base64.b64decode(result["result"])

APPROVAL = """
#pragma version 8
txn ApplicationID
bz create
txn OnCompletion
int OptIn
==
bnz opt_in
txn OnCompletion
int NoOp
==
bnz no_op
int 0
return

create:
  byte "total_orders"
  int 0
  app_global_put
  byte "total_volume"
  int 0
  app_global_put
  int 1
  return

opt_in:
  byte "status"
  int 0
  app_local_put
  byte "amount"
  int 0
  app_local_put
  int 1
  return

no_op:
  txna ApplicationArgs 0
  byte "create_escrow"
  ==
  bnz create_escrow
  txna ApplicationArgs 0
  byte "confirm_delivery"
  ==
  bnz confirm_delivery
  txna ApplicationArgs 0
  byte "cancel_escrow"
  ==
  bnz cancel_escrow
  int 0
  return

create_escrow:
  txn Sender
  app_local_get
  pop
  byte "status"
  app_local_get
  int 0
  ==
  assert
  txn Sender
  byte "status"
  int 1
  app_local_put
  txn Sender
  byte "amount"
  gtxn 1 Amount
  app_local_put
  txn Sender
  byte "order_id"
  txna ApplicationArgs 1
  app_local_put
  byte "total_orders"
  byte "total_orders"
  app_global_get
  int 1
  +
  app_global_put
  byte "total_volume"
  byte "total_volume"
  app_global_get
  gtxn 1 Amount
  +
  app_global_put
  int 1
  return

confirm_delivery:
  txn Sender
  byte "status"
  int 2
  app_local_put
  int 1
  return

cancel_escrow:
  txn Sender
  byte "status"
  int 3
  app_local_put
  int 1
  return
"""

CLEAR = """
#pragma version 8
int 1
"""

def deploy():
    private_key, address = get_deployer()
    print(f"Deployer: {address}")

    info = client.account_info(address)
    print(f"Balance: {info['amount']/1e6:.3f} ALGO")

    approval  = compile_teal(APPROVAL)
    clear     = compile_teal(CLEAR)

    sp = client.suggested_params()

    txn = transaction.ApplicationCreateTxn(
        sender=address,
        sp=sp,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval,
        clear_program=clear,
        global_schema=transaction.StateSchema(num_uints=2, num_byte_slices=0),
        local_schema=transaction.StateSchema(num_uints=2, num_byte_slices=1),
    )

    signed = txn.sign(private_key)
    tx_id  = client.send_transaction(signed)
    print(f"TX ID: {tx_id}")

    result = transaction.wait_for_confirmation(client, tx_id, 4)
    app_id = result["application-index"]
    app_address = account.address_from_private_key(private_key)

    import algosdk
    app_addr = algosdk.logic.get_application_address(app_id)

    print(f"\n✅ Contract deployed!")
    print(f"APP_ID:      {app_id}")
    print(f"APP_ADDRESS: {app_addr}")

    with open("scripts/deployment.json", "w") as f:
        json.dump({"app_id": app_id, "app_address": app_addr}, f, indent=2)
    print("\nSaved to scripts/deployment.json")

if __name__ == "__main__":
    deploy()
