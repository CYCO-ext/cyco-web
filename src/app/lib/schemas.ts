import { z } from "zod";


export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const registerStep1Schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres" }),
  role: z.enum(["CATADOR", "GERADOR", "ENTREGADOR"]),
});

export const extraFieldsSchema = z.object({
  firstName: z.string().min(2, "Nome obrigatório"),
  lastName: z.string().min(2, { message: "Sobrenome obrigatório" }),
  phone: z.string().min(8, "Telefone obrigatório"),
  ddd: z.string().min(2, "DDD obrigatório"),
  ddi: z.string().min(2, "DDI obrigatório"),

  birthDate: z.string().optional(),

  document: z.string().min(5, "Documento obrigatório"),

  cep: z.string().optional(),
  number: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  complement: z.string().optional(),

  companyName: z.string().optional(),
  wasteCollectorId: z.string().optional(),
  licenseNumber: z.string().optional(),
  vehicleOption: z.string().optional(),
  vehiclePlate: z.string().optional(),
});

export const registerSchema = registerStep1Schema
  .merge(extraFieldsSchema)
  .superRefine((data, ctx) => {
    if (data.role === "GERADOR") {
      if (!data.birthDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data de nascimento obrigatória",
          path: ["birthDate"],
        });
      }
    }

    if (data.role === "ENTREGADOR") {
      if (!data.birthDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data de nascimento obrigatória",
          path: ["birthDate"],
        });
      }

      if (!data.wasteCollectorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Coletor responsável obrigatório",
          path: ["wasteCollectorId"],
        });
      }

      if (!data.licenseNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CNH obrigatória",
          path: ["licenseNumber"],
        });
      }

      if (!data.vehicleOption) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Veículo obrigatório",
          path: ["vehicleOption"],
        });
      }

      if (!data.vehiclePlate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Placa obrigatória",
          path: ["vehiclePlate"],
        });
      }
    }

    if (data.role === "CATADOR") {
      if (!data.cep) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CEP obrigatório",
          path: ["cep"],
        });
      }

      if (!data.number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número obrigatório",
          path: ["number"],
        });
      }
    }

    if (data.companyName && data.companyName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Razão social inválida",
        path: ["companyName"],
      });
    }
  });

export type RegisterSchemaType = z.infer<typeof registerSchema>;


// Lista de materiais estática
export const materialsList = [
  "Glass",
  "Plastic",
  "Paper",
  "Metal",
  "Organic",
];
