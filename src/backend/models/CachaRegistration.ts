import mongoose, { Schema, Document, Model } from "mongoose";

// Interface para TypeScript
export interface ICachaRegistration extends Document {
  nombre: string;
  email: string;
  telefono: string;
  edad: number;
  mensaje?: string;
  fechaRegistro: Date;
  fechaConfirmacion?: Date;
  estado: "pendiente" | "confirmado" | "asistio" | "cancelado";
  codigoConfirmacion?: string;
  notificacionesEnviadas: boolean;
  confirmarAsistencia(): Promise<ICachaRegistration>;
  marcarAsistencia(): Promise<ICachaRegistration>;
  cancelarRegistro(): Promise<ICachaRegistration>;
}

// Interface para métodos estáticos
export interface ICachaRegistrationModel extends Model<ICachaRegistration> {
  findByEmail(email: string): Promise<ICachaRegistration | null>;
  getEstadisticas(): Promise<any[]>;
}

// Schema de Mongoose
const CachaRegistrationSchema = new Schema<ICachaRegistration>(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Email inválido"],
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
      match: [/^[\d\s\-\+\(\)]+$/, "Formato de teléfono inválido"],
    },
    edad: {
      type: Number,
      required: true,
      min: 13,
      max: 100,
    },
    mensaje: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    fechaRegistro: {
      type: Date,
      default: Date.now,
    },
    fechaConfirmacion: {
      type: Date,
    },
    estado: {
      type: String,
      enum: ["pendiente", "confirmado", "asistio", "cancelado"],
      default: "pendiente",
    },
    codigoConfirmacion: {
      type: String,
      unique: true,
      sparse: true,
    },
    notificacionesEnviadas: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para optimización
CachaRegistrationSchema.index({ email: 1 }, { unique: true });
CachaRegistrationSchema.index({ fechaRegistro: -1 });
CachaRegistrationSchema.index({ estado: 1 });

// Middleware pre-save para generar código de confirmación
CachaRegistrationSchema.pre("save", function (next) {
  if (this.isNew && !this.codigoConfirmacion) {
    // Generar código más descriptivo para Cacha
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.codigoConfirmacion = `CACHA-${randomPart}`;
  }
  next();
});

// Métodos del schema
CachaRegistrationSchema.methods.confirmarAsistencia = function () {
  this.estado = "confirmado";
  return this.save();
};

CachaRegistrationSchema.methods.marcarAsistencia = function () {
  this.estado = "asistio";
  return this.save();
};

CachaRegistrationSchema.methods.cancelarRegistro = function () {
  this.estado = "cancelado";
  return this.save();
};

// Método estático para buscar por email
CachaRegistrationSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Método estático para obtener estadísticas
CachaRegistrationSchema.statics.getEstadisticas = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$estado",
        count: { $sum: 1 },
      },
    },
  ]);
};

// Exportar el modelo
const CachaRegistration = (mongoose.models.CachaRegistration ||
  mongoose.model<ICachaRegistration, ICachaRegistrationModel>(
    "CachaRegistration",
    CachaRegistrationSchema
  )) as ICachaRegistrationModel;

export default CachaRegistration;
