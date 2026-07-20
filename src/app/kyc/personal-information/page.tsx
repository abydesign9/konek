"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function PersonalInformationPage() {

  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    country: "",
    address: "",
  });

  const [saving, setSaving] = useState(false);


  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }


  async function submit() {

    setSaving(true);

    // Placeholder connection.
    // API integration will be added after the flow is complete.

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    setSaving(false);

  }


  return (
    <main className="min-h-screen bg-background">

      <PageHeader
        title="Identity Verification"
        backHref="/kyc"
      />


      <div className="max-w-lg mx-auto px-5 py-6">


        {/* Step Progress */}

        <div className="mb-6">

          <p className="text-sm text-indigo/60 mb-3">
            Step 1 of 3
          </p>


          <div className="flex gap-2">

            <div className="h-2 flex-1 rounded-full bg-indigo" />

            <div className="h-2 flex-1 rounded-full bg-indigo/10" />

            <div className="h-2 flex-1 rounded-full bg-indigo/10" />

          </div>

        </div>




        <div className="rounded-2xl bg-white border border-indigo/10 p-6">


          <h1 className="text-xl font-bold text-indigo mb-2">
            Personal Information
          </h1>


          <p className="text-sm text-indigo/60 mb-6">
            Tell us about yourself to verify your identity.
          </p>



          {/* Full Name */}

          <label className="block text-sm font-semibold text-indigo mb-2">
            Full Name
          </label>

          <input
            value={form.fullName}
            onChange={(e) =>
              updateField(
                "fullName",
                e.target.value
              )
            }
            placeholder="Enter your full name"
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-5 outline-none"
          />




          {/* Date */}

          <label className="block text-sm font-semibold text-indigo mb-2">
            Date of Birth
          </label>

          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) =>
              updateField(
                "dateOfBirth",
                e.target.value
              )
            }
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-5 outline-none"
          />




          {/* Country */}

          <label className="block text-sm font-semibold text-indigo mb-2">
            Country
          </label>

          <input
            value={form.country}
            onChange={(e) =>
              updateField(
                "country",
                e.target.value
              )
            }
            placeholder="Select country"
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-5 outline-none"
          />





          {/* Address */}

          <label className="block text-sm font-semibold text-indigo mb-2">
            Residential Address
          </label>

          <textarea
            value={form.address}
            onChange={(e) =>
              updateField(
                "address",
                e.target.value
              )
            }
            placeholder="Enter your address"
            rows={3}
            className="w-full rounded-xl border border-indigo/20 px-4 py-3 mb-6 outline-none"
          />




          <Link
            href="/kyc/document"
            onClick={submit}
            className="block w-full rounded-xl bg-indigo text-white text-center py-3 font-semibold"
          >
            {saving
              ? "Saving..."
              : "Continue"}
          </Link>


        </div>


      </div>

    </main>
  );
}
