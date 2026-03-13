import { z } from "zod";


export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});


export const registerStep1Schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CATADOR", "GERADOR"]),
});


export const commonDetailsSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(8),
  document: z.string().min(5),
  cep: z.string().min(8),
  number: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  district: z.string().min(1),
  complement: z.string().optional(),
});


export const catadorExtrasSchema = z.object({
  materials: z.array(z.string()).min(1, "Selecione pelo menos um material"),
});


export type RegisterPayload = z.infer<typeof registerStep1Schema> &
  z.infer<typeof commonDetailsSchema> &
  Partial<z.infer<typeof catadorExtrasSchema>>;

// Novos schemas para rotas server-side
export const phoneSchema = z.object({
  ddi: z.number().optional(),
  ddd: z.number().optional(),
  number: z.number().optional(),
});

export const generatorCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  birthDate: z.string().optional(),
  document: z.string().min(5),
  name: z.string().min(1),
  phone: phoneSchema.optional(),
});

export const generatorAddressSchema = z.object({
  zipCode: z.string().min(1),
  complement: z.string().optional(),
  number: z.string().optional(),
});

export const wasteCollectorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  isEnterprise: z.boolean().optional(),
  materials: z.array(z.string()).optional(),
  phone: phoneSchema.optional(),
  document: z.string().min(5).optional(),
  address: z.object({ zipCode: z.string().optional() }).optional(),
  enterprise: z.object({
    companyName: z.string().optional(),
    commercialName: z.string().optional(),
  }).optional(),
});

export const sessionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Tipos inferidos
export type GeneratorCreate = z.infer<typeof generatorCreateSchema>;
export type GeneratorAddress = z.infer<typeof generatorAddressSchema>;
export type WasteCollector = z.infer<typeof wasteCollectorSchema>;
export type SessionPayload = z.infer<typeof sessionSchema>;

// Lista de materiais estática
export const materialsList = [
  "Glass",
  "Plastic",
  "Paper",
  "Metal",
  "Organic",
];
