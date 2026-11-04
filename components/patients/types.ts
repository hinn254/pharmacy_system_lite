export type SerializedDrugRef = {
  genericName: string;
  internalCode: string;
};

export type SerializedPrescriptionItem = {
  id: string;
  quantity: number;
  instructions: string | null;
  drug: SerializedDrugRef;
};

export type SerializedPrescription = {
  id: string;
  rxNumber: string | null;
  prescriberName: string | null;
  issuedAt: string | null;
  refillDueAt: string | null;
  notes: string | null;
  items: SerializedPrescriptionItem[];
};

export type SerializedPatient = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  dob: string | null;
  notes: string | null;
  marketingConsent: boolean;
  prescriptions: SerializedPrescription[];
};

export type DrugSelectOption = {
  id: string;
  genericName: string;
  internalCode: string;
};
