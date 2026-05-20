import { z } from 'zod';

export const ClientUpdateSchema = z.object({
  name: z.string().min(5, { message: 'Se requiere el nombre' }),
  phone: z.string().min(3, { message: 'Se requiere el teléfono' }),
  email: z.string().min(5, { message: 'Se requiere el email' }),
  updatedAt: z.date(),
});

export const ClientPasswordUpdateSchema = z.object({
  newPassword: z
    .string()
    .min(8, { message: 'Se requiere una contraseña nueva' }),
  currentPassword: z
    .string()
    .min(6, { message: 'Se requiere tu contraseña actual' }),
  updatedAt: z.date(),
});

export const AddressEntrySchema = z.object({
  street: z.string().min(5, { message: 'Se requiere la calle y numero' }),
  city: z.string().min(3, { message: 'Se requiere la ciudad' }),
  province: z
    .string()
    .min(3, { message: 'Se requiere la provincia o entidad' }),
  zip_code: z.string().min(5, { message: 'Se requiere el código postal' }),
  country: z.string().min(1, { message: 'Se requiere el país' }),
  phone: z.string().min(5, { message: 'Se requiere numero de teléfono ' }),
});

export const PostEntrySchema = z.object({
  mainTitle: z.string().min(5, { message: 'Se requiere el titulo' }),
  category: z.string().min(3, { message: 'Se requiere la categoría' }),
  mainImage: z
    .string()
    .min(3, { message: 'Se requiere la la imagen principal' }),
  //summary: z.string().min(5, { message: 'Se requiere el resumen' }),
  createdAt: z.date(),
});

export const PostUpdateSchema = z.object({
  mainTitle: z.string().min(5, { message: 'Se requiere el titulo' }),
  category: z.string().min(3, { message: 'Se requiere la categoría' }),
  mainImage: z
    .string()
    .min(3, { message: 'Se requiere la la imagen principal' }),
  //summary: z.string().min(5, { message: 'Se requiere el resumen' }),
  updatedAt: z.date(),
});

export const PageEntrySchema = z.object({
  mainTitle: z.string().min(5, { message: 'Se requiere el titulo' }),
  mainImage: z
    .string()
    .min(3, { message: 'Se requiere la la imagen principal' }),
  //summary: z.string().min(5, { message: 'Se requiere el resumen' }),
  createdAt: z.date(),
});

export const PageUpdateSchema = z.object({
  mainTitle: z.string().min(5, { message: 'Se requiere el titulo' }),
  category: z.string().min(3, { message: 'Se requiere la categoría' }),
  mainImage: z
    .string()
    .min(3, { message: 'Se requiere la la imagen principal' }),
  //summary: z.string().min(5, { message: 'Se requiere el resumen' }),
  updatedAt: z.date(),
});

export const ProductEntrySchema = z.object({
  title: z.string().min(5, { message: 'Se requiere el titulo' }),
  description: z.string().min(3, { message: 'Se requiere la description' }),
  brand: z.string().min(3, { message: 'Se requiere la marca' }),
  category: z.string().min(3, { message: 'Se requiere la categoría' }),
  colors: z.array(
    z.object({ value: z.string(), label: z.string(), hex: z.string() })
  ),
  sizes: z.array(z.object({ value: z.string(), label: z.string() })),
  tags: z.array(z.object({ value: z.string(), label: z.string() })),
  images: z.array(z.object({ url: z.string() })),
  gender: z.string().min(1, { message: 'Se requiere el genero' }),
  stock: z.number(),
  price: z.number(),
  cost: z.number(),
  createdAt: z.date(),
});

export const VariationProductEntrySchema = z.object({
  title: z.string().min(5, { message: 'Se requiere el titulo' }),
  description: z.string().min(3, { message: 'Se requiere la description' }),
  brand: z.string().min(3, { message: 'Se requiere la marca' }),
  category: z.string().min(3, { message: 'Se requiere la categoría' }),
  images: z.array(z.object({ url: z.string() })),
  tags: z.array(z.object({ value: z.string(), label: z.string() })),
  variations: z.array(
    z.object({
      stock: z.number(),
      color: z.string(),
      size: z.string(),
      cost: z.number(),
      price: z.number(),
      image: z.string(),
    })
  ),
  stock: z.number(),
  gender: z.string().min(1, { message: 'Se requiere el genero' }),
  createdAt: z.date(),
});

export const VariationUpdateProductEntrySchema = z.object({
  title: z.string().min(5, { message: 'Se requiere el titulo' }),
  description: z.string().min(3, { message: 'Se requiere la description' }),
  brand: z.string().min(3, { message: 'Se requiere la marca' }),
  category: z.string().min(3, { message: 'Se requiere la categoría' }),
  images: z.array(z.object({ url: z.string() })),
  tags: z.array(z.object({ value: z.string(), label: z.string() })),
  variations: z.array(
    z.object({
      stock: z.number(),
      color: z.string(),
      size: z.string(),
      cost: z.number(),
      price: z.number(),
      image: z.string(),
    })
  ),
  stock: z.number(),
  gender: z.string().min(1, { message: 'Se requiere el genero' }),
  updatedAt: z.date(),
});

export const VerifyEmailSchema = z.object({
  email: z.string().min(5, { message: 'Se requiere un correo electrónico' }),
});
