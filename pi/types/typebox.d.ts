// Ambient declarations for modules pi provides to extensions at runtime via jiti.
// These types are only for static/editor checking; pi resolves the real module at runtime.
declare module "typebox" {
  export type TSchema = { [key: string]: unknown };
  export const Type: {
    String(options?: unknown): TSchema;
    Number(options?: unknown): TSchema;
    Integer(options?: unknown): TSchema;
    Boolean(options?: unknown): TSchema;
    Object(properties: Record<string, TSchema>, options?: unknown): TSchema;
    Optional(schema: TSchema): TSchema;
    Array(schema: TSchema, options?: unknown): TSchema;
  };
}
