import { describe, expect, it } from "vitest";
import { parsePriceSheet } from "./priceSheet";

describe("price sheet parser", () => {
  it("parses a standard sheet and converts money to minor units", () => {
    const csv = [
      "service_type,external_id,name,network,currency,cost,price",
      "data,mtn-1gb,1GB Monthly,MTN,NGN,550,600",
    ].join("\n");

    const { rows, errors } = parsePriceSheet(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      serviceType: "data",
      externalId: "mtn-1gb",
      name: "1GB Monthly",
      network: "MTN",
      currency: "NGN",
      costMinor: 55000, // ₦550.00
      priceMinor: 60000, // ₦600.00
    });
  });

  it("accepts finance-style header aliases", () => {
    const csv = ["Product,SKU,Plan Name,Provider,Buying Price", "cable,dstv-compact,DStv Compact,DStv,18400"].join("\n");
    const { rows, errors } = parsePriceSheet(csv);
    expect(errors).toEqual([]);
    expect(rows[0].serviceType).toBe("cable");
    expect(rows[0].externalId).toBe("dstv-compact");
    expect(rows[0].costMinor).toBe(1840000);
  });

  it("leaves price null so the importer can apply the markup", () => {
    const csv = ["service_type,code,name,cost", "data,glo-2gb,2GB,1000"].join("\n");
    const { rows } = parsePriceSheet(csv);
    expect(rows[0].priceMinor).toBeNull();
  });

  it("strips currency symbols, thousands separators and handles decimals", () => {
    const csv = ["service_type,code,name,cost,price", 'data,x,"Big, bundle","₦1,500.50","₦2,000"'].join("\n");
    const { rows, errors } = parsePriceSheet(csv);
    expect(errors).toEqual([]);
    expect(rows[0].name).toBe("Big, bundle"); // quoted comma survived
    expect(rows[0].costMinor).toBe(150050);
    expect(rows[0].priceMinor).toBe(200000);
  });

  it("supports tab-separated files", () => {
    const tsv = ["service_type\tcode\tname\tcost", "esim\tus-1gb\tUSA 1GB\t4.5"].join("\n");
    const { rows, errors } = parsePriceSheet(tsv);
    expect(errors).toEqual([]);
    expect(rows[0].costMinor).toBe(450);
  });

  it("falls back to the chosen service type when the sheet has no column", () => {
    const csv = ["code,name,cost", "waec,WAEC pin,4500"].join("\n");
    const { rows, errors } = parsePriceSheet(csv, "exam_pin");
    expect(errors).toEqual([]);
    expect(rows[0].serviceType).toBe("exam_pin");
  });

  it("reports missing required columns instead of importing garbage", () => {
    const csv = ["foo,bar", "1,2"].join("\n");
    const { rows, errors } = parsePriceSheet(csv);
    expect(rows).toHaveLength(0);
    expect(errors.join(" ")).toMatch(/code/i);
  });

  it("skips blank lines but flags unusable rows", () => {
    const csv = ["service_type,code,name,cost", "data,a,A,100", "", "data,b,B,notanumber"].join("\n");
    const { rows, errors } = parsePriceSheet(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/no usable cost or price/i);
  });
});
