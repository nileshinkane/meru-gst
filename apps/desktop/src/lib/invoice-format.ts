export type InvoiceLineItem = {
  id: string;
  mrp: number;
  product: string;
  hsn: string;
  gstRate: number;
  pack: string;
  batch: string;
  expiry: string;
  manufacturer: string;
  saleQty: number;
  freeQty: number;
  rate: number;
};

export type Invoice = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  gstin: string;
  drugLicense: string;
  fssai: string;
  dmNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceType: string;
  customerName: string;
  customerAddress: string;
  customerGstin: string;
  customerDrugLicense: string;
  transport: string;
  cartons: number;
  cases: number;
  lrNumber: string;
  lrDate: string;
  freight: number;
  items: InvoiceLineItem[];
};

export type PrintCharacterSet = "box" | "ascii";

export type InvoiceTotals = {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  freight: number;
  roundOff: number;
  netAmount: number;
};

const boxChars = {
  topLeft: "╔",
  topJoin: "╤",
  topRight: "╗",
  midLeft: "╠",
  midJoin: "╪",
  midRight: "╣",
  sectionJoin: "╧",
  bottomLeft: "╚",
  bottomJoin: "╧",
  bottomRight: "╝",
  horizontal: "═",
  vertical: "║",
  separator: "│",
};

const asciiChars = {
  topLeft: "+",
  topJoin: "+",
  topRight: "+",
  midLeft: "+",
  midJoin: "+",
  midRight: "+",
  sectionJoin: "+",
  bottomLeft: "+",
  bottomJoin: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
  separator: "|",
};

const columns = [7, 19, 5, 4, 8, 13, 6, 6, 5, 4, 8, 10];
const tableWidth = columns.reduce((sum, width) => sum + width, 0) + columns.length + 1;
const contentWidth = tableWidth - 2;

export function createDefaultInvoice(): Invoice {
  return {
    companyName: "MERU PHARMACEUTICALS",
    companyAddress: "76, Ayodhya Nagar NAGPUR-440 024",
    companyPhone: "(0712) 744708",
    gstin: "27AACPI7993N1ZY",
    drugLicense: "20B-255760/2018, 21B-255761/2018",
    fssai: "21518260001528",
    dmNumber: "0",
    invoiceNumber: "MP/ 4/2026-2027",
    invoiceDate: "24/04/2026",
    dueDate: "09/05/2026",
    invoiceType: "CREDIT",
    customerName: "SHIVKRIPA MEDICAL STORES",
    customerAddress: "KIRMITI (MENDHA) DIST.CHANDRAPUR",
    customerGstin: "",
    customerDrugLicense: "20-1178,21-1178",
    transport: "SYNDICATE GARAGE",
    cartons: 0,
    cases: 0,
    lrNumber: "",
    lrDate: "",
    freight: 0,
    items: [
      {
        id: "line-1",
        mrp: 59.05,
        product: "ACLOPASS TAB.",
        hsn: "3004",
        gstRate: 5,
        pack: "10'TAB",
        batch: "YT250740B",
        expiry: "9/27",
        manufacturer: "Y.P.",
        saleQty: 60,
        freeQty: 0,
        rate: 14.8,
      },
      {
        id: "line-2",
        mrp: 112.5,
        product: "Ketoven-Plus 6",
        hsn: "3004",
        gstRate: 5,
        pack: "15 gms",
        batch: "Y227",
        expiry: "10/27",
        manufacturer: "Y.P.",
        saleQty: 30,
        freeQty: 0,
        rate: 28.85,
      },
    ],
  };
}

export function calculateLineAmount(item: InvoiceLineItem) {
  return roundMoney(item.saleQty * item.rate);
}

export function calculateTotals(invoice: Invoice): InvoiceTotals {
  const taxableAmount = roundMoney(
    invoice.items.reduce((sum, item) => sum + calculateLineAmount(item), 0),
  );
  const cgst = roundMoney(
    invoice.items.reduce(
      (sum, item) => sum + calculateLineAmount(item) * (item.gstRate / 2 / 100),
      0,
    ),
  );
  const sgst = cgst;
  const beforeRound = roundMoney(taxableAmount + cgst + sgst - invoice.freight);
  const netAmount = Math.round(beforeRound);
  const roundOff = roundMoney(beforeRound - netAmount);

  return {
    taxableAmount,
    cgst,
    sgst,
    freight: invoice.freight,
    roundOff,
    netAmount,
  };
}

export function formatInvoiceDocument(
  invoice: Invoice,
  options: { copies?: number; characterSet?: PrintCharacterSet } = {},
) {
  const copies = options.copies ?? 2;
  const output: string[] = [];

  for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
    if (copyIndex > 0) {
      output.push("");
      output.push("");
    }

    output.push(...formatInvoiceCopy(invoice, options.characterSet ?? "box"));
  }

  return output.join("\n");
}

function formatInvoiceCopy(invoice: Invoice, characterSet: PrintCharacterSet) {
  const chars = characterSet === "box" ? boxChars : asciiChars;
  const totals = calculateTotals(invoice);
  const lines: string[] = [];

  lines.push(center(invoice.companyName));
  lines.push(center(`${invoice.companyAddress}, Ph. No. ${invoice.companyPhone}.`));
  lines.push(center("TAX INVOICE"));
  lines.push(
    leftRight(
      `Invoice No. : ${invoice.invoiceNumber}  ${invoice.invoiceType}`,
      `Date : ${invoice.invoiceDate}`,
    ),
  );
  lines.push(leftRight(`GSTIN No. ${invoice.gstin}`, `FSSAI: ${invoice.fssai}`));
  lines.push(
    leftRight(
      `Drug Lic.NO.${invoice.drugLicense}`,
      `D.M.No. ${invoice.dmNumber} Date :${invoice.invoiceDate}`,
    ),
  );
  lines.push("To,");
  lines.push(leftRight(`M/s. ${invoice.customerName},`, `GST No.${invoice.customerGstin}`));
  lines.push(
    leftRight(
      `${invoice.customerAddress}.`,
      `D.L. No.${invoice.customerDrugLicense}.`,
    ),
  );
  lines.push(
    leftRight(
      `Transport : ${invoice.transport}.`,
      `Cartons ${invoice.cartons} C/B  Rr/LR No.${invoice.lrNumber} Date ${invoice.lrDate}`,
    ),
  );
  lines.push(border(chars.topLeft, chars.topJoin, chars.topRight, chars.horizontal));
  lines.push(
    row(chars, [
      "M.R.P.",
      "Products",
      "HSNC",
      "GST",
      "Pack",
      "Batch",
      "Exp.",
      "Mfgr.",
      "Sale",
      "Free",
      "Rate",
      "Amount",
    ]),
  );
  lines.push(
    row(chars, [
      "Incl.",
      "",
      "",
      "",
      "",
      "No.",
      "Date",
      "Comp.",
      "Qty",
      "",
      "Rs. Ps",
      "Rs. Ps",
    ]),
  );
  lines.push(border(chars.midLeft, chars.midJoin, chars.midRight, chars.horizontal));

  invoice.items.forEach((item) => {
    lines.push(
      row(chars, [
        money(item.mrp),
        item.product,
        item.hsn,
        `${item.gstRate}%`,
        item.pack,
        item.batch,
        item.expiry,
        item.manufacturer,
        integer(item.saleQty),
        integer(item.freeQty),
        money(item.rate),
        money(calculateLineAmount(item)),
      ]),
    );
  });

  lines.push(border(chars.midLeft, chars.sectionJoin, chars.midRight, chars.horizontal));
  lines.push(
    boxedLine(
      chars,
      leftRightContent(
        "AMOUNT   CGST   TAXAMT  SGST   TAXAMT",
        `Total Amount....Rs. ${money(totals.taxableAmount)}`,
      ),
    ),
  );
  lines.push(
    boxedLine(
      chars,
      fit(
        `${money(totals.taxableAmount)}   ${(invoice.items[0]?.gstRate ?? 0) / 2}%   ${money(
          totals.cgst,
        )}   ${(invoice.items[0]?.gstRate ?? 0) / 2}%   ${money(totals.sgst)}`,
        contentWidth,
      ),
    ),
  );
  lines.push(boxedLine(chars, leftRightContent("", `Add CGST ........Rs. ${money(totals.cgst)}`)));
  lines.push(boxedLine(chars, leftRightContent("", `Add SGST ........Rs. ${money(totals.sgst)}`)));
  if (totals.freight > 0) {
    lines.push(
      boxedLine(chars, leftRightContent("", `Less Freight.... Rs. ${money(totals.freight)}`)),
    );
  }
  lines.push(
    boxedLine(
      chars,
      leftRightContent(
        `No. of Products: ${invoice.items.length}`,
        `Rounded off..${totals.roundOff >= 0 ? "(-)" : "(+)"} Rs. ${money(
          Math.abs(totals.roundOff),
        )}`,
      ),
    ),
  );
  lines.push(border(chars.midLeft, chars.topJoin, chars.midRight, chars.horizontal));
  lines.push(
    boxedLine(
      chars,
      leftRightContent(`Due Date : ${invoice.dueDate}`, `Net Amount........... ${money(totals.netAmount)}`),
    ),
  );
  lines.push(border(chars.midLeft, chars.midJoin, chars.midRight, chars.horizontal));
  lines.push(
    boxedLine(chars, leftRightContent(`Rs. ${numberToIndianWords(totals.netAmount)} Only`, "E & O. E")),
  );
  lines.push(border(chars.midLeft, chars.midJoin, chars.midRight, chars.horizontal));
  lines.push(boxedLine(chars, leftRightContent("Subject to NAGPUR JURISDICTION", `For ${toTitle(invoice.companyName)}`)));
  lines.push(
    boxedLine(
      chars,
      fit("Certified that our GSTN No. is in force on the date of this sale", contentWidth),
    ),
  );
  lines.push(
    boxedLine(chars, leftRightContent("All goods sold on non-returnable basis", "")),
  );
  lines.push(boxedLine(chars, leftRightContent("24% interest charged after due date", "")));
  lines.push(boxedLine(chars, ""));
  lines.push(
    boxedLine(chars, leftRightContent("Received Goods              Signature", "Authorised Signatory")),
  );
  lines.push(border(chars.bottomLeft, chars.bottomJoin, chars.bottomRight, chars.horizontal));

  return lines;
}

function row(chars: typeof boxChars, cells: string[]) {
  return `${chars.vertical}${cells
    .map((cell, index) => alignCell(cell, columns[index], numericColumn(index)))
    .join(chars.separator)}${chars.vertical}`;
}

function boxedLine(chars: typeof boxChars, value: string) {
  return `${chars.vertical}${fit(value, contentWidth)}${chars.vertical}`;
}

function border(left: string, join: string, right: string, horizontal: string) {
  return `${left}${columns.map((width) => horizontal.repeat(width)).join(join)}${right}`;
}

function center(value: string) {
  const text = fit(value, contentWidth).trim();
  const left = Math.floor((contentWidth - text.length) / 2);
  return `${" ".repeat(Math.max(left, 0))}${text}`;
}

function leftRight(left: string, right: string) {
  return leftRightContent(left, right);
}

function leftRightContent(left: string, right: string) {
  const safeLeft = truncate(left, contentWidth);
  const safeRight = truncate(right, contentWidth);
  const gap = contentWidth - safeLeft.length - safeRight.length;

  if (gap < 1) {
    return fit(`${safeLeft} ${safeRight}`, contentWidth);
  }

  return `${safeLeft}${" ".repeat(gap)}${safeRight}`;
}

function alignCell(value: string, width: number, rightAlign = false) {
  const text = truncate(value, width);
  return rightAlign ? text.padStart(width, " ") : text.padEnd(width, " ");
}

function numericColumn(index: number) {
  return [0, 8, 9, 10, 11].includes(index);
}

function fit(value: string, width: number) {
  return truncate(value, width).padEnd(width, " ");
}

function truncate(value: string | number, width: number) {
  const text = String(value ?? "");
  return text.length > width ? text.slice(0, width) : text;
}

function money(value: number) {
  return roundMoney(value).toFixed(2);
}

function integer(value: number) {
  return Math.round(value).toString();
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toTitle(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function numberToIndianWords(value: number) {
  if (value === 0) {
    return "Zero";
  }

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const belowHundred = (amount: number) => {
    if (amount < 20) {
      return ones[amount];
    }
    return `${tens[Math.floor(amount / 10)]}${amount % 10 ? ` ${ones[amount % 10]}` : ""}`;
  };

  const belowThousand = (amount: number) => {
    if (amount < 100) {
      return belowHundred(amount);
    }
    return `${ones[Math.floor(amount / 100)]} Hundred${
      amount % 100 ? ` ${belowHundred(amount % 100)}` : ""
    }`;
  };

  const rounded = Math.round(value);
  const parts: string[] = [];
  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const remainder = rounded % 1000;

  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (remainder) parts.push(belowThousand(remainder));

  return parts.join(" ");
}
