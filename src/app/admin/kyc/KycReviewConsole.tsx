"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Badge,
  Card,
  Col,
  EmptyState,
  Grid,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/adminUi";

interface KycApplication {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  document_type: string;
  front_original_name: string;
  back_original_name: string | null;
  front_mime_type: string;
  back_mime_type: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  bvn_verified: boolean;
  nin_verified: boolean;
  kyc_tier: number;
  kyc_status: string;
  open_risk_flags?: string | number;
  risk_flag_types?: string[] | null;
}

interface QueueResponse {
  applications?: KycApplication[];
  total?: number;
  error?: string;
}

function formatDocumentType(
  value: string
): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(
  value: string | null
): string {
  if (!value) return "Not submitted";

  return new Date(value).toLocaleString();
}

export function KycReviewConsole() {
  const [
    applications,
    setApplications,
  ] = useState<KycApplication[]>([]);

  const [
    selected,
    setSelected,
  ] = useState<KycApplication | null>(
    null
  );

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<string | null>(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const loadApplications =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/admin/kyc",
            {
              cache: "no-store",
            }
          );

        const data: QueueResponse =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Could not load the KYC queue"
          );
        }

        const rows =
          data.applications ?? [];

        setApplications(rows);

        setSelected((current) => {
          if (!current) {
            return rows[0] ?? null;
          }

          return (
            rows.find(
              (row) =>
                row.id === current.id
            ) ??
            rows[0] ??
            null
          );
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the KYC queue"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  async function approve() {
    if (!selected) return;

    const confirmed = window.confirm(
      "Approve this application and grant Tier 2 access?"
    );

    if (!confirmed) return;

    setProcessing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/kyc/${selected.id}/approve`,
        {
          method: "POST",
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not approve the application"
        );
      }

      setMessage(
        "KYC approved. Tier 2 access has been granted."
      );

      setRejectionReason("");
      await loadApplications();
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Could not approve the application"
      );
    } finally {
      setProcessing(false);
    }
  }

  async function reject() {
    if (!selected) return;

    const reason =
      rejectionReason.trim();

    if (reason.length < 5) {
      setError(
        "Enter a clear rejection reason."
      );
      return;
    }

    const confirmed = window.confirm(
      "Reject this KYC application?"
    );

    if (!confirmed) return;

    setProcessing(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/kyc/${selected.id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            reason,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Could not reject the application"
        );
      }

      setMessage(
        "KYC rejected. The customer can correct and resubmit."
      );

      setRejectionReason("");
      await loadApplications();
    } catch (rejectionError) {
      setError(
        rejectionError instanceof Error
          ? rejectionError.message
          : "Could not reject the application"
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="KYC review"
        description="Review encrypted government documents and approve or reject Tier 2 applications."
      />

      {message && (
        <div className="mb-5 rounded-xl border border-konek-green/30 bg-konek-green/10 px-4 py-3 text-sm text-indigo">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Grid>
        <Col span={7}>
          <Card
            title="Pending applications"
            description={`${applications.length} application${applications.length === 1 ? "" : "s"} awaiting review`}
            action={
              <button
                type="button"
                onClick={loadApplications}
                disabled={loading}
                className="text-xs font-semibold text-indigo underline disabled:opacity-50"
              >
                Refresh
              </button>
            }
          >
            {loading ? (
              <p className="py-8 text-center text-sm text-text-secondary">
                Loading applications...
              </p>
            ) : applications.length === 0 ? (
              <EmptyState message="No KYC applications are waiting for review." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Document</Th>
                    <Th>Submitted</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>

                <tbody>
                  {applications.map(
                    (application) => (
                      <tr key={application.id}>
                        <Td>
                          <p className="font-semibold text-indigo">
                            {application.full_name ??
                              "Unnamed customer"}
                          </p>

                          <p className="text-xs text-text-secondary">
                            {application.phone}
                          </p>
                        </Td>

                        <Td>
                          {formatDocumentType(
                            application.document_type
                          )}
                        </Td>

                        <Td>
                          {formatDate(
                            application.submitted_at
                          )}
                        </Td>

                        <Td>
                          <Badge tone="gold">
                            Pending
                          </Badge>
                        </Td>

                        <Td>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(
                                application
                              );
                              setRejectionReason(
                                ""
                              );
                              setMessage(null);
                              setError(null);
                            }}
                            className="text-xs font-semibold text-indigo underline"
                          >
                            Review
                          </button>
                        </Td>
                      </tr>
                    )
                  )}
                </tbody>
              </Table>
            )}
          </Card>
        </Col>

        <Col span={5}>
          <Card
            title="Application details"
            description="Documents open through an authenticated, no-cache admin route."
          >
            {!selected ? (
              <EmptyState message="Select an application to review." />
            ) : (
              <div className="space-y-5">
                {Number(selected.open_risk_flags ?? 0) > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm font-bold text-red-700">
                      ⚠ {selected.open_risk_flags} open risk flag{Number(selected.open_risk_flags) === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-xs text-red-600">
                      {(selected.risk_flag_types ?? []).join(", ") || "Review fraud queue before approving."}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Customer
                  </p>

                  <p className="mt-1 font-semibold text-indigo">
                    {selected.full_name ??
                      "Unnamed customer"}
                  </p>

                  <p className="text-sm text-text-secondary">
                    {selected.phone}
                  </p>

                  {selected.email && (
                    <p className="text-sm text-text-secondary">
                      {selected.email}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Identity status
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      tone={
                        selected.bvn_verified
                          ? "green"
                          : "neutral"
                      }
                    >
                      BVN{" "}
                      {selected.bvn_verified
                        ? "verified"
                        : "not verified"}
                    </Badge>

                    <Badge
                      tone={
                        selected.nin_verified
                          ? "green"
                          : "neutral"
                      }
                    >
                      NIN{" "}
                      {selected.nin_verified
                        ? "verified"
                        : "not verified"}
                    </Badge>

                    <Badge tone="indigo">
                      Tier {selected.kyc_tier}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Uploaded document
                  </p>

                  <p className="mt-1 font-semibold text-indigo">
                    {formatDocumentType(
                      selected.document_type
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/api/admin/kyc/${selected.id}/document/front`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-indigo px-3 py-2 text-xs font-semibold text-white"
                    >
                      View front
                    </a>

                    {selected.back_original_name && (
                      <a
                        href={`/api/admin/kyc/${selected.id}/document/back`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border-soft px-3 py-2 text-xs font-semibold text-indigo"
                      >
                        View back
                      </a>
                    )}
                  </div>

                  <p className="mt-2 break-all text-xs text-text-secondary">
                    {selected.front_original_name}
                  </p>
                </div>

                <div className="border-t border-border-soft pt-5">
                  <button
                    type="button"
                    onClick={approve}
                    disabled={processing}
                    className="w-full rounded-lg bg-konek-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {processing
                      ? "Processing..."
                      : "Approve and Grant Tier 2"}
                  </button>
                </div>

                <div className="border-t border-border-soft pt-5">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Rejection reason
                  </label>

                  <textarea
                    value={rejectionReason}
                    onChange={(event) =>
                      setRejectionReason(
                        event.target.value
                      )
                    }
                    rows={4}
                    maxLength={500}
                    placeholder="Explain what the customer must correct..."
                    className="w-full rounded-lg border border-border-soft px-3 py-2 text-sm text-indigo"
                  />

                  <button
                    type="button"
                    onClick={reject}
                    disabled={
                      processing ||
                      rejectionReason.trim()
                        .length < 5
                    }
                    className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Grid>
    </>
  );
}
