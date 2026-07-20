import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount_minor: string;
  currency: string;
  created_at: string;
}


export default async function TransactionsPage() {

  const userId = await getSessionUserId();

  if (!userId) redirect("/login");


  const { rows } = await query<Transaction>(
    `SELECT id, type, status, amount_minor, currency, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );


  return (

    <main className="min-h-screen bg-background pb-28">

      <PageHeader
        title="Transactions"
        backHref="/wallet"
      />


      <div className="max-w-lg mx-auto px-5 py-6">


        <div className="grid grid-cols-4 gap-2 mb-6">

          {[
            "All",
            "Money In",
            "Money Out",
            "Bills"
          ].map((item)=>(

            <button
              key={item}
              className="rounded-xl bg-indigo/10 py-2 text-xs font-semibold text-indigo"
            >
              {item}
            </button>

          ))}

        </div>




        {rows.length === 0 ? (

          <div className="rounded-3xl bg-white border border-indigo/10 p-8 text-center">

            <p className="text-3xl mb-3">
              📄
            </p>

            <p className="font-semibold text-indigo">
              No transactions yet
            </p>

            <p className="text-sm text-indigo/50 mt-2">
              Your wallet activity will appear here.
            </p>

          </div>


        ) : (


          <div className="flex flex-col gap-3">


            {rows.map((txn)=>(

              <Link

                key={txn.id}

                href={`/wallet/receipt/${txn.id}`}

                className="rounded-2xl bg-white border border-indigo/10 p-4 flex justify-between items-center"

              >

                <div>

                  <p className="font-semibold text-indigo capitalize">
                    {txn.type.replace(/_/g," ")}
                  </p>


                  <p className="text-xs text-indigo/50">
                    {new Date(txn.created_at).toLocaleDateString()}
                    {" · "}
                    {txn.status}
                  </p>

                </div>


                <p className="font-bold text-indigo">

                  {txn.currency === "USD" ? "$" : "₦"}

                  {(Number(txn.amount_minor)/100)
                  .toLocaleString()}

                </p>


              </Link>

            ))}


          </div>

        )}


      </div>


    </main>

  );

}
