
export const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const clientNames = [
  "NovaTech Group",
  "Lumen Energy",
  "Harbour Collective",
  "Northwind Retail",
  "Beacon plc"
];

export const pickClientName = (): string => {
  const idx = Math.floor(Math.random() * clientNames.length);
  return clientNames[idx];
};
