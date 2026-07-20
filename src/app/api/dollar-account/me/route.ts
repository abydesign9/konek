import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getFxRateConfig } from "@/lib/fx";
import { getUserWalletAccount } from "@/lib/ledger/accounts";
import { getBalance } from "@/lib/ledger/balance";
import { getKycStatus } from "@/lib/kyc/kycService";


export async function GET() {

  const userId = await getSessionUserId();


  if (!userId) {

    return NextResponse.json(
      {
        error: "unauthenticated"
      },
      {
        status: 401
      }
    );

  }



  const kyc =
    await getKycStatus(userId);





  const { rows: accounts } =
    await query(
      `SELECT 
        id,
        currency,
        provider_ref,
        account_number,
        routing_number,
        bank_name,
        status
       FROM virtual_accounts
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );





  const balances = [];



  for (const account of accounts) {


    const balanceMinor =
      await getBalance(
        await getUserWalletAccount(
          userId,
          account.currency
        )
      );




    const { rows: inflowRows } =
      await query(
        `SELECT 
          sender_name,
          sender_bank,
          amount_minor,
          currency,
          status,
          received_at
         FROM virtual_account_inflows
         WHERE virtual_account_id = $1
         ORDER BY received_at DESC
         LIMIT 20`,
        [account.id]
      );




    balances.push({

      ...account,

      balanceMinor,

      inflows: inflowRows,

    });


  }




  const fx =
    await getFxRateConfig();





  return NextResponse.json({

    kyc: {

      bvnVerified:
        kyc.bvnVerified,


      approved:
        kyc.status === "approved",

    },


    accounts: balances,


    fx,


  });


}
