import { describe, expect, it } from "vitest";
import { parsePlanSheet } from "./planSheet";

describe("parsePlanSheet", () => {
  it("parses a well-formed CSV with aliased headers", () => {
    const csv = [
      "package_code,country,operator,data,validity,buying_price",
      "NG-5GB-30,NG,MTN,5,30,2.85",
      "US-10GB-30,US,ATT,10,30,4.20",
    ].join("\n");
    const { rows, errors } = parsePlanSheet(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ sku: "NG-5GB-30", country: "NG", costMinor: 285, currency: "USD" });
    expect(rows[1].costMinor).toBe(420);
  });

  it("handles TSV, dollar signs and quoted fields", () => {
    const tsv = 'code\tcountry\tdata\tdays\tcost\n"P1"\tGB\t3\t7\t"$1.50"';
    const { rows, errors } = parsePlanSheet(tsv);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ sku: "P1", costMinor: 150 });
  });

  it("flags missing required columns", () => {
    const { rows, errors } = parsePlanSheet("name,price\nfoo,1.00");
    expect(rows).toHaveLength(0);
    expect(errors.some((e) => /code column/.test(e))).toBe(true);
  });

  it("skips rows with an invalid cost but keeps the rest", () => {
    const csv = ["sku,data,validity,cost", "A,1,7,abc", "B,2,7,3.00"].join("\n");
    const { rows, errors } = parsePlanSheet(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].sku).toBe("B");
    expect(errors.some((e) => /Line 2: invalid cost/.test(e))).toBe(true);
  });

  it("detects out-of-stock from a stock column", () => {
    const csv = ["sku,data,validity,cost,stock", "A,1,7,1.00,out of stock", "B,2,7,2.00,in stock"].join("\n");
    const { rows } = parsePlanSheet(csv);
    expect(rows[0].stockStatus).toBe("out_of_stock");
    expect(rows[1].stockStatus).toBe("in_stock");
  });
});
