export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      adelantos_personal: {
        Row: {
          aplicado_at: string | null
          created_at: string
          estado: Database["public"]["Enums"]["adelanto_estado"]
          fecha: string
          id: string
          liquidacion_id: string | null
          monto: number
          motivo: string | null
          personal_id: string
          updated_at: string
        }
        Insert: {
          aplicado_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["adelanto_estado"]
          fecha?: string
          id?: string
          liquidacion_id?: string | null
          monto: number
          motivo?: string | null
          personal_id: string
          updated_at?: string
        }
        Update: {
          aplicado_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["adelanto_estado"]
          fecha?: string
          id?: string
          liquidacion_id?: string | null
          monto?: number
          motivo?: string | null
          personal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adelantos_personal_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adelantos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adelantos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adelantos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      cargas_combustible_repartidor: {
        Row: {
          created_at: string | null
          fecha: string
          horas: number | null
          id: string
          km: number | null
          litros: number
          maquinaria_id: string | null
          numero_remito: number | null
          obra_id: string | null
          observaciones: string | null
          operador_id: string | null
          parte_diario_id: string | null
          repartidor_id: string | null
          tipo_movimiento: string
          tipo_operador: string | null
          tipo_producto: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fecha: string
          horas?: number | null
          id?: string
          km?: number | null
          litros?: number
          maquinaria_id?: string | null
          numero_remito?: number | null
          obra_id?: string | null
          observaciones?: string | null
          operador_id?: string | null
          parte_diario_id?: string | null
          repartidor_id?: string | null
          tipo_movimiento?: string
          tipo_operador?: string | null
          tipo_producto?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          horas?: number | null
          id?: string
          km?: number | null
          litros?: number
          maquinaria_id?: string | null
          numero_remito?: number | null
          obra_id?: string | null
          observaciones?: string | null
          operador_id?: string | null
          parte_diario_id?: string | null
          repartidor_id?: string | null
          tipo_movimiento?: string
          tipo_operador?: string | null
          tipo_producto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargas_combustible_repartidor_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_parte_diario_id_fkey"
            columns: ["parte_diario_id"]
            isOneToOne: false
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      certificado_conceptos: {
        Row: {
          activo: boolean
          cantidad_total: number
          categoria: string
          created_at: string
          etapa: string | null
          id: string
          nombre: string
          obra_id: string
          orden: number
          precio_unitario: number
          tipo: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          cantidad_total?: number
          categoria?: string
          created_at?: string
          etapa?: string | null
          id?: string
          nombre: string
          obra_id: string
          orden?: number
          precio_unitario?: number
          tipo?: string
          unidad: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          cantidad_total?: number
          categoria?: string
          created_at?: string
          etapa?: string | null
          id?: string
          nombre?: string
          obra_id?: string
          orden?: number
          precio_unitario?: number
          tipo?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_conceptos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      certificado_items: {
        Row: {
          cantidad: number
          certificado_id: string
          concepto_id: string | null
          created_at: string
          descripcion: string
          etapa: string | null
          id: string
          observaciones: string | null
          precio_unitario: number
          seccion: string | null
          subtotal: number
          unidad: string
        }
        Insert: {
          cantidad?: number
          certificado_id: string
          concepto_id?: string | null
          created_at?: string
          descripcion: string
          etapa?: string | null
          id?: string
          observaciones?: string | null
          precio_unitario?: number
          seccion?: string | null
          subtotal?: number
          unidad: string
        }
        Update: {
          cantidad?: number
          certificado_id?: string
          concepto_id?: string | null
          created_at?: string
          descripcion?: string
          etapa?: string | null
          id?: string
          observaciones?: string | null
          precio_unitario?: number
          seccion?: string | null
          subtotal?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_items_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificado_items_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "certificado_conceptos"
            referencedColumns: ["id"]
          },
        ]
      }
      certificado_pagos: {
        Row: {
          banco: string | null
          certificado_id: string
          comprobante_url: string | null
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          metodo: string | null
          monto: number
          referencia: string | null
        }
        Insert: {
          banco?: string | null
          certificado_id: string
          comprobante_url?: string | null
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          metodo?: string | null
          monto?: number
          referencia?: string | null
        }
        Update: {
          banco?: string | null
          certificado_id?: string
          comprobante_url?: string | null
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          metodo?: string | null
          monto?: number
          referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificado_pagos_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          anticipo_porcentaje: number
          created_at: string
          estado: Database["public"]["Enums"]["estado_certificado"]
          fecha_certificado: string
          fecha_emision: string | null
          id: string
          incluir_iva: boolean
          iva: number
          numero: string
          obra_id: string
          observaciones: string | null
          periodo: string
          subtotal: number
          tipo: string
          total: number
          updated_at: string
        }
        Insert: {
          anticipo_porcentaje?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_certificado"]
          fecha_certificado?: string
          fecha_emision?: string | null
          id?: string
          incluir_iva?: boolean
          iva?: number
          numero: string
          obra_id: string
          observaciones?: string | null
          periodo: string
          subtotal?: number
          tipo?: string
          total?: number
          updated_at?: string
        }
        Update: {
          anticipo_porcentaje?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_certificado"]
          fecha_certificado?: string
          fecha_emision?: string | null
          id?: string
          incluir_iva?: boolean
          iva?: number
          numero?: string
          obra_id?: string
          observaciones?: string | null
          periodo?: string
          subtotal?: number
          tipo?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean
          contacto: string | null
          created_at: string
          cuit: string | null
          direccion: string | null
          email: string | null
          id: string
          localidad: string | null
          nombre: string
          observaciones: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          observaciones?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          observaciones?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contab_asiento_lineas: {
        Row: {
          asiento_id: string
          created_at: string
          cuenta_id: string | null
          debe: number
          descripcion: string | null
          haber: number
          id: string
          maquinaria_id: string | null
          obra_id: string | null
          orden: number
        }
        Insert: {
          asiento_id: string
          created_at?: string
          cuenta_id?: string | null
          debe?: number
          descripcion?: string | null
          haber?: number
          id?: string
          maquinaria_id?: string | null
          obra_id?: string | null
          orden?: number
        }
        Update: {
          asiento_id?: string
          created_at?: string
          cuenta_id?: string | null
          debe?: number
          descripcion?: string | null
          haber?: number
          id?: string
          maquinaria_id?: string | null
          obra_id?: string | null
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "contab_asiento_lineas_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "contab_asientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_asiento_lineas_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "contab_plan_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_asiento_lineas_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_asiento_lineas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      contab_asientos: {
        Row: {
          comprobante_id: string | null
          created_at: string
          created_by: string | null
          descripcion: string
          fecha: string
          id: string
          numero: number
          origen: string | null
          pago_id: string | null
          total_debe: number
          total_haber: number
          updated_at: string
        }
        Insert: {
          comprobante_id?: string | null
          created_at?: string
          created_by?: string | null
          descripcion: string
          fecha: string
          id?: string
          numero?: number
          origen?: string | null
          pago_id?: string | null
          total_debe?: number
          total_haber?: number
          updated_at?: string
        }
        Update: {
          comprobante_id?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string
          fecha?: string
          id?: string
          numero?: number
          origen?: string | null
          pago_id?: string | null
          total_debe?: number
          total_haber?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contab_asientos_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "contab_comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_asientos_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "contab_pagos"
            referencedColumns: ["id"]
          },
        ]
      }
      contab_comprobante_items: {
        Row: {
          alicuota_iva: number
          cantidad: number
          comprobante_id: string
          created_at: string
          cuenta_id: string | null
          descripcion: string
          id: string
          iva: number
          maquinaria_id: string | null
          neto: number
          obra_id: string | null
          orden: number
          precio_unit: number
          updated_at: string
        }
        Insert: {
          alicuota_iva?: number
          cantidad?: number
          comprobante_id: string
          created_at?: string
          cuenta_id?: string | null
          descripcion: string
          id?: string
          iva?: number
          maquinaria_id?: string | null
          neto?: number
          obra_id?: string | null
          orden?: number
          precio_unit?: number
          updated_at?: string
        }
        Update: {
          alicuota_iva?: number
          cantidad?: number
          comprobante_id?: string
          created_at?: string
          cuenta_id?: string | null
          descripcion?: string
          id?: string
          iva?: number
          maquinaria_id?: string | null
          neto?: number
          obra_id?: string | null
          orden?: number
          precio_unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contab_comprobante_items_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "contab_comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_comprobante_items_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "contab_plan_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_comprobante_items_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_comprobante_items_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      contab_comprobantes: {
        Row: {
          anulado_at: string | null
          asiento_id: string | null
          confirmado_at: string | null
          confirmado_por: string | null
          cotizacion: number
          created_at: string
          created_by: string | null
          empresa_id: string | null
          es_venta: boolean
          estado: Database["public"]["Enums"]["contab_cbte_estado"]
          exento: number
          fecha: string
          fecha_vto: string | null
          id: string
          iva_105: number
          iva_21: number
          iva_27: number
          letra: string | null
          maquinaria_id: string | null
          moneda: string
          neto_0: number
          neto_105: number
          neto_21: number
          neto_27: number
          no_gravado: number
          numero: number
          obra_id: string | null
          observaciones: string | null
          perc_iibb: number
          perc_iva: number
          perc_otras: number
          punto_venta: number
          tercero_id: string | null
          tipo: Database["public"]["Enums"]["contab_cbte_tipo"]
          total: number
          updated_at: string
        }
        Insert: {
          anulado_at?: string | null
          asiento_id?: string | null
          confirmado_at?: string | null
          confirmado_por?: string | null
          cotizacion?: number
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          es_venta?: boolean
          estado?: Database["public"]["Enums"]["contab_cbte_estado"]
          exento?: number
          fecha: string
          fecha_vto?: string | null
          id?: string
          iva_105?: number
          iva_21?: number
          iva_27?: number
          letra?: string | null
          maquinaria_id?: string | null
          moneda?: string
          neto_0?: number
          neto_105?: number
          neto_21?: number
          neto_27?: number
          no_gravado?: number
          numero: number
          obra_id?: string | null
          observaciones?: string | null
          perc_iibb?: number
          perc_iva?: number
          perc_otras?: number
          punto_venta?: number
          tercero_id?: string | null
          tipo: Database["public"]["Enums"]["contab_cbte_tipo"]
          total?: number
          updated_at?: string
        }
        Update: {
          anulado_at?: string | null
          asiento_id?: string | null
          confirmado_at?: string | null
          confirmado_por?: string | null
          cotizacion?: number
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          es_venta?: boolean
          estado?: Database["public"]["Enums"]["contab_cbte_estado"]
          exento?: number
          fecha?: string
          fecha_vto?: string | null
          id?: string
          iva_105?: number
          iva_21?: number
          iva_27?: number
          letra?: string | null
          maquinaria_id?: string | null
          moneda?: string
          neto_0?: number
          neto_105?: number
          neto_21?: number
          neto_27?: number
          no_gravado?: number
          numero?: number
          obra_id?: string | null
          observaciones?: string | null
          perc_iibb?: number
          perc_iva?: number
          perc_otras?: number
          punto_venta?: number
          tercero_id?: string | null
          tipo?: Database["public"]["Enums"]["contab_cbte_tipo"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contab_comprobantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "contab_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_comprobantes_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_comprobantes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_comprobantes_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "contab_terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      contab_empresa: {
        Row: {
          activa: boolean
          condicion_iva: Database["public"]["Enums"]["contab_cond_iva"]
          cp: string | null
          created_at: string
          cuit: string
          domicilio_fiscal: string | null
          email: string | null
          id: string
          iibb: string | null
          inicio_actividades: string | null
          localidad: string | null
          logo_url: string | null
          nombre_fantasia: string | null
          pie_factura: string | null
          provincia: string | null
          razon_social: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          condicion_iva?: Database["public"]["Enums"]["contab_cond_iva"]
          cp?: string | null
          created_at?: string
          cuit: string
          domicilio_fiscal?: string | null
          email?: string | null
          id?: string
          iibb?: string | null
          inicio_actividades?: string | null
          localidad?: string | null
          logo_url?: string | null
          nombre_fantasia?: string | null
          pie_factura?: string | null
          provincia?: string | null
          razon_social: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          condicion_iva?: Database["public"]["Enums"]["contab_cond_iva"]
          cp?: string | null
          created_at?: string
          cuit?: string
          domicilio_fiscal?: string | null
          email?: string | null
          id?: string
          iibb?: string | null
          inicio_actividades?: string | null
          localidad?: string | null
          logo_url?: string | null
          nombre_fantasia?: string | null
          pie_factura?: string | null
          provincia?: string | null
          razon_social?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contab_pagos: {
        Row: {
          asiento_id: string | null
          comprobante_id: string | null
          created_at: string
          created_by: string | null
          cuenta_id: string | null
          es_cobro: boolean
          fecha: string
          id: string
          maquinaria_id: string | null
          medio: Database["public"]["Enums"]["contab_pago_medio"]
          monto: number
          obra_id: string | null
          observaciones: string | null
          referencia: string | null
          tercero_id: string | null
          updated_at: string
        }
        Insert: {
          asiento_id?: string | null
          comprobante_id?: string | null
          created_at?: string
          created_by?: string | null
          cuenta_id?: string | null
          es_cobro?: boolean
          fecha: string
          id?: string
          maquinaria_id?: string | null
          medio?: Database["public"]["Enums"]["contab_pago_medio"]
          monto?: number
          obra_id?: string | null
          observaciones?: string | null
          referencia?: string | null
          tercero_id?: string | null
          updated_at?: string
        }
        Update: {
          asiento_id?: string | null
          comprobante_id?: string | null
          created_at?: string
          created_by?: string | null
          cuenta_id?: string | null
          es_cobro?: boolean
          fecha?: string
          id?: string
          maquinaria_id?: string | null
          medio?: Database["public"]["Enums"]["contab_pago_medio"]
          monto?: number
          obra_id?: string | null
          observaciones?: string | null
          referencia?: string | null
          tercero_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contab_pagos_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "contab_comprobantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_pagos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "contab_plan_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_pagos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_pagos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contab_pagos_tercero_id_fkey"
            columns: ["tercero_id"]
            isOneToOne: false
            referencedRelation: "contab_terceros"
            referencedColumns: ["id"]
          },
        ]
      }
      contab_plan_cuentas: {
        Row: {
          activa: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          imputable: boolean
          nombre: string
          parent_id: string | null
          tipo: Database["public"]["Enums"]["contab_cuenta_tipo"]
          updated_at: string
        }
        Insert: {
          activa?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          imputable?: boolean
          nombre: string
          parent_id?: string | null
          tipo: Database["public"]["Enums"]["contab_cuenta_tipo"]
          updated_at?: string
        }
        Update: {
          activa?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          imputable?: boolean
          nombre?: string
          parent_id?: string | null
          tipo?: Database["public"]["Enums"]["contab_cuenta_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contab_plan_cuentas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "contab_plan_cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      contab_puntos_venta: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          empresa_id: string
          id: string
          numero: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          id?: string
          numero: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          id?: string
          numero?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contab_puntos_venta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "contab_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      contab_terceros: {
        Row: {
          activo: boolean
          banco: string | null
          cbu: string | null
          condicion_iva: Database["public"]["Enums"]["contab_cond_iva"]
          cp: string | null
          created_at: string
          cuit: string | null
          domicilio: string | null
          email: string | null
          id: string
          localidad: string | null
          notas: string | null
          numero_cuenta: string | null
          provincia: string | null
          razon_social: string
          telefono: string | null
          tipo: Database["public"]["Enums"]["contab_tercero_tipo"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          banco?: string | null
          cbu?: string | null
          condicion_iva?: Database["public"]["Enums"]["contab_cond_iva"]
          cp?: string | null
          created_at?: string
          cuit?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          notas?: string | null
          numero_cuenta?: string | null
          provincia?: string | null
          razon_social: string
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["contab_tercero_tipo"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          banco?: string | null
          cbu?: string | null
          condicion_iva?: Database["public"]["Enums"]["contab_cond_iva"]
          cp?: string | null
          created_at?: string
          cuit?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          notas?: string | null
          numero_cuenta?: string | null
          provincia?: string | null
          razon_social?: string
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["contab_tercero_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      cotizacion_anticipos: {
        Row: {
          cotizacion_id: string
          created_at: string
          descripcion: string
          id: string
          monto: number
          orden: number
          tipo: string
          valor: number
        }
        Insert: {
          cotizacion_id: string
          created_at?: string
          descripcion?: string
          id?: string
          monto?: number
          orden?: number
          tipo?: string
          valor?: number
        }
        Update: {
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          monto?: number
          orden?: number
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_anticipos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_categorias: {
        Row: {
          cotizacion_id: string
          created_at: string | null
          id: string
          nombre: string
          numero: number
          orden: number | null
        }
        Insert: {
          cotizacion_id: string
          created_at?: string | null
          id?: string
          nombre: string
          numero: number
          orden?: number | null
        }
        Update: {
          cotizacion_id?: string
          created_at?: string | null
          id?: string
          nombre?: string
          numero?: number
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_categorias_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_items: {
        Row: {
          altura_promedio: number | null
          cantidad: number
          cantidad_m2: number | null
          cantidad_m3: number | null
          categoria_id: string | null
          cotizacion_id: string
          created_at: string
          descripcion: string
          id: string
          numero: string | null
          precio_unitario: number
          subtotal: number
          total: number | null
          unidad: string
        }
        Insert: {
          altura_promedio?: number | null
          cantidad: number
          cantidad_m2?: number | null
          cantidad_m3?: number | null
          categoria_id?: string | null
          cotizacion_id: string
          created_at?: string
          descripcion: string
          id?: string
          numero?: string | null
          precio_unitario: number
          subtotal: number
          total?: number | null
          unidad: string
        }
        Update: {
          altura_promedio?: number | null
          cantidad?: number
          cantidad_m2?: number | null
          cantidad_m3?: number | null
          categoria_id?: string | null
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          numero?: string | null
          precio_unitario?: number
          subtotal?: number
          total?: number | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          anticipo_monto: number
          anticipo_tipo: string
          anticipo_valor: number
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion: string
          fecha_vencimiento: string | null
          id: string
          iva: number
          moneda: string
          notas: string | null
          numero: string | null
          obra_id: string | null
          responsable: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          anticipo_monto?: number
          anticipo_tipo?: string
          anticipo_valor?: number
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion?: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number
          moneda?: string
          notas?: string | null
          numero?: string | null
          obra_id?: string | null
          responsable?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          anticipo_monto?: number
          anticipo_tipo?: string
          anticipo_valor?: number
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion?: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number
          moneda?: string
          notas?: string | null
          numero?: string | null
          obra_id?: string | null
          responsable?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      empleado_documentos: {
        Row: {
          created_at: string
          descripcion: string | null
          firma_data_url: string | null
          firmado_at: string | null
          firmado_ip: string | null
          id: string
          mime_type: string | null
          nombre_original: string | null
          periodo: string | null
          personal_id: string
          storage_path: string
          tamano_bytes: number | null
          tipo: Database["public"]["Enums"]["tipo_documento_empleado"]
          titulo: string
          updated_at: string
          uploaded_by: string | null
          visto_at: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          firma_data_url?: string | null
          firmado_at?: string | null
          firmado_ip?: string | null
          id?: string
          mime_type?: string | null
          nombre_original?: string | null
          periodo?: string | null
          personal_id: string
          storage_path: string
          tamano_bytes?: number | null
          tipo: Database["public"]["Enums"]["tipo_documento_empleado"]
          titulo: string
          updated_at?: string
          uploaded_by?: string | null
          visto_at?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          firma_data_url?: string | null
          firmado_at?: string | null
          firmado_ip?: string | null
          id?: string
          mime_type?: string | null
          nombre_original?: string | null
          periodo?: string | null
          personal_id?: string
          storage_path?: string
          tamano_bytes?: number | null
          tipo?: Database["public"]["Enums"]["tipo_documento_empleado"]
          titulo?: string
          updated_at?: string
          uploaded_by?: string | null
          visto_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleado_documentos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleado_documentos_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega_epp_items: {
        Row: {
          cantidad: number
          created_at: string
          entrega_id: string
          id: string
          marca: string | null
          posee_certificacion: boolean | null
          producto: string
          tipo_modelo: string | null
        }
        Insert: {
          cantidad?: number
          created_at?: string
          entrega_id: string
          id?: string
          marca?: string | null
          posee_certificacion?: boolean | null
          producto: string
          tipo_modelo?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          entrega_id?: string
          id?: string
          marca?: string | null
          posee_certificacion?: boolean | null
          producto?: string
          tipo_modelo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrega_epp_items_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas_epp"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_epp: {
        Row: {
          created_at: string
          fecha: string
          id: string
          personal_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          personal_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          personal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_epp_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_epp_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_epp_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      horas_maquina: {
        Row: {
          created_at: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas_trabajadas: number
          id: string
          maquinaria_id: string
          obra_id: string
          observaciones: string | null
          operador_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas_trabajadas: number
          id?: string
          maquinaria_id: string
          obra_id: string
          observaciones?: string | null
          operador_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          horas_trabajadas?: number
          id?: string
          maquinaria_id?: string
          obra_id?: string
          observaciones?: string | null
          operador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horas_maquina_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_maquina_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_maquina_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_maquina_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_maquina_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacion_config_personal: {
        Row: {
          banco: string | null
          cbu: string | null
          created_at: string
          embargo: boolean
          embargo_nota: string | null
          id: string
          modalidad: Database["public"]["Enums"]["liquidacion_modalidad"]
          monto_banco_fijo: number
          numero_cuenta: string | null
          personal_id: string
          presentismo_monto: number
          presentismo_porcentaje: number
          resto_efectivo: boolean
          sueldo_blanco: number
          sueldo_negro: number
          updated_at: string
        }
        Insert: {
          banco?: string | null
          cbu?: string | null
          created_at?: string
          embargo?: boolean
          embargo_nota?: string | null
          id?: string
          modalidad?: Database["public"]["Enums"]["liquidacion_modalidad"]
          monto_banco_fijo?: number
          numero_cuenta?: string | null
          personal_id: string
          presentismo_monto?: number
          presentismo_porcentaje?: number
          resto_efectivo?: boolean
          sueldo_blanco?: number
          sueldo_negro?: number
          updated_at?: string
        }
        Update: {
          banco?: string | null
          cbu?: string | null
          created_at?: string
          embargo?: boolean
          embargo_nota?: string | null
          id?: string
          modalidad?: Database["public"]["Enums"]["liquidacion_modalidad"]
          monto_banco_fijo?: number
          numero_cuenta?: string | null
          personal_id?: string
          presentismo_monto?: number
          presentismo_porcentaje?: number
          resto_efectivo?: boolean
          sueldo_blanco?: number
          sueldo_negro?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_config_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_config_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_config_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacion_items: {
        Row: {
          adelantos: number
          banco_snapshot: string | null
          bruto_blanco: number
          bruto_negro: number
          cbu_snapshot: string | null
          created_at: string
          cuota_prestamo: number
          dias_falta: number
          dias_licencia: number
          embargo: boolean
          horas_extras_100: number
          horas_extras_50: number
          id: string
          importe_he: number
          liquidacion_id: string
          monto_banco: number
          monto_efectivo: number
          neto_blanco: number
          neto_negro: number
          neto_total: number
          numero_cuenta_snapshot: string | null
          observaciones: string | null
          otros_adicionales: number
          otros_descuentos: number
          pagado: boolean
          pagado_at: string | null
          personal_id: string
          presentismo: number
          updated_at: string
        }
        Insert: {
          adelantos?: number
          banco_snapshot?: string | null
          bruto_blanco?: number
          bruto_negro?: number
          cbu_snapshot?: string | null
          created_at?: string
          cuota_prestamo?: number
          dias_falta?: number
          dias_licencia?: number
          embargo?: boolean
          horas_extras_100?: number
          horas_extras_50?: number
          id?: string
          importe_he?: number
          liquidacion_id: string
          monto_banco?: number
          monto_efectivo?: number
          neto_blanco?: number
          neto_negro?: number
          neto_total?: number
          numero_cuenta_snapshot?: string | null
          observaciones?: string | null
          otros_adicionales?: number
          otros_descuentos?: number
          pagado?: boolean
          pagado_at?: string | null
          personal_id: string
          presentismo?: number
          updated_at?: string
        }
        Update: {
          adelantos?: number
          banco_snapshot?: string | null
          bruto_blanco?: number
          bruto_negro?: number
          cbu_snapshot?: string | null
          created_at?: string
          cuota_prestamo?: number
          dias_falta?: number
          dias_licencia?: number
          embargo?: boolean
          horas_extras_100?: number
          horas_extras_50?: number
          id?: string
          importe_he?: number
          liquidacion_id?: string
          monto_banco?: number
          monto_efectivo?: number
          neto_blanco?: number
          neto_negro?: number
          neto_total?: number
          numero_cuenta_snapshot?: string | null
          observaciones?: string | null
          otros_adicionales?: number
          otros_descuentos?: number
          pagado?: boolean
          pagado_at?: string | null
          personal_id?: string
          presentismo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liquidacion_items_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_items_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_items_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacion_items_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidaciones: {
        Row: {
          anio: number
          cerrada_at: string | null
          created_at: string
          estado: Database["public"]["Enums"]["liquidacion_estado"]
          fecha_pago: string | null
          id: string
          mes: number
          observaciones: string | null
          pagada_at: string | null
          periodo: Database["public"]["Enums"]["liquidacion_periodo"]
          total_banco: number
          total_blanco: number
          total_efectivo: number
          total_negro: number
          total_neto: number
          updated_at: string
        }
        Insert: {
          anio: number
          cerrada_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["liquidacion_estado"]
          fecha_pago?: string | null
          id?: string
          mes: number
          observaciones?: string | null
          pagada_at?: string | null
          periodo: Database["public"]["Enums"]["liquidacion_periodo"]
          total_banco?: number
          total_blanco?: number
          total_efectivo?: number
          total_negro?: number
          total_neto?: number
          updated_at?: string
        }
        Update: {
          anio?: number
          cerrada_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["liquidacion_estado"]
          fecha_pago?: string | null
          id?: string
          mes?: number
          observaciones?: string | null
          pagada_at?: string | null
          periodo?: Database["public"]["Enums"]["liquidacion_periodo"]
          total_banco?: number
          total_blanco?: number
          total_efectivo?: number
          total_negro?: number
          total_neto?: number
          updated_at?: string
        }
        Relationships: []
      }
      mantenimientos: {
        Row: {
          adjunto_url: string | null
          alerta_campo: string | null
          checklist_cambio: Json | null
          checklist_chequeo: Json | null
          costo_mano_obra: number
          costo_repuestos: number
          costo_total: number
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_mantenimiento"]
          fecha: string
          horas_maquina: number
          id: string
          informe_tecnico: string | null
          kilometros: number | null
          maquinaria_id: string
          observacion_reporte_id: string | null
          observaciones: string | null
          proximo_mantenimiento: string | null
          proximo_service_hr: number | null
          proximo_service_km: number | null
          repuestos: string | null
          tecnico: string
          tecnico_id: string | null
          tipo: Database["public"]["Enums"]["tipo_mantenimiento"]
          updated_at: string
        }
        Insert: {
          adjunto_url?: string | null
          alerta_campo?: string | null
          checklist_cambio?: Json | null
          checklist_chequeo?: Json | null
          costo_mano_obra?: number
          costo_repuestos?: number
          costo_total?: number
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_mantenimiento"]
          fecha: string
          horas_maquina: number
          id?: string
          informe_tecnico?: string | null
          kilometros?: number | null
          maquinaria_id: string
          observacion_reporte_id?: string | null
          observaciones?: string | null
          proximo_mantenimiento?: string | null
          proximo_service_hr?: number | null
          proximo_service_km?: number | null
          repuestos?: string | null
          tecnico: string
          tecnico_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_mantenimiento"]
          updated_at?: string
        }
        Update: {
          adjunto_url?: string | null
          alerta_campo?: string | null
          checklist_cambio?: Json | null
          checklist_chequeo?: Json | null
          costo_mano_obra?: number
          costo_repuestos?: number
          costo_total?: number
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_mantenimiento"]
          fecha?: string
          horas_maquina?: number
          id?: string
          informe_tecnico?: string | null
          kilometros?: number | null
          maquinaria_id?: string
          observacion_reporte_id?: string | null
          observaciones?: string | null
          proximo_mantenimiento?: string | null
          proximo_service_hr?: number | null
          proximo_service_km?: number | null
          repuestos?: string | null
          tecnico?: string
          tecnico_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_mantenimiento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_observacion_reporte_id_fkey"
            columns: ["observacion_reporte_id"]
            isOneToOne: false
            referencedRelation: "observaciones_maquina_estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinarias: {
        Row: {
          anio: number | null
          codigo: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas: number
          id: string
          km_acumulados: number | null
          marca: string | null
          nombre: string | null
          obra_id: string | null
          operador_asignado_id: string | null
          patente: string | null
          tipo: Database["public"]["Enums"]["tipo_maquinaria"]
          updated_at: string
        }
        Insert: {
          anio?: number | null
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas?: number
          id?: string
          km_acumulados?: number | null
          marca?: string | null
          nombre?: string | null
          obra_id?: string | null
          operador_asignado_id?: string | null
          patente?: string | null
          tipo?: Database["public"]["Enums"]["tipo_maquinaria"]
          updated_at?: string
        }
        Update: {
          anio?: number | null
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas?: number
          id?: string
          km_acumulados?: number | null
          marca?: string | null
          nombre?: string | null
          obra_id?: string | null
          operador_asignado_id?: string | null
          patente?: string | null
          tipo?: Database["public"]["Enums"]["tipo_maquinaria"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maquinarias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinarias_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinarias_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinarias_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          comprobante: string | null
          created_at: string
          fecha: string
          id: string
          item_id: string
          motivo: string
          obra_id: string | null
          observaciones: string | null
          responsable_id: string
          stock_anterior: number
          stock_nuevo: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Insert: {
          cantidad: number
          comprobante?: string | null
          created_at?: string
          fecha: string
          id?: string
          item_id: string
          motivo: string
          obra_id?: string | null
          observaciones?: string | null
          responsable_id: string
          stock_anterior: number
          stock_nuevo: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Update: {
          cantidad?: number
          comprobante?: string | null
          created_at?: string
          fecha?: string
          id?: string
          item_id?: string
          motivo?: string
          obra_id?: string | null
          observaciones?: string | null
          responsable_id?: string
          stock_anterior?: number
          stock_nuevo?: number
          tipo?: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente_id: string | null
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          numero: string | null
          responsable_id: string | null
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          numero?: string | null
          responsable_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          numero?: string | null
          responsable_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      observaciones_maquina_estado: {
        Row: {
          atendida: boolean
          atendida_por: string | null
          created_at: string
          fecha_atencion: string | null
          fecha_reporte: string
          id: string
          maquinaria_id: string | null
          notas_resolucion: string | null
          observacion: string
          parte_diario_id: string
        }
        Insert: {
          atendida?: boolean
          atendida_por?: string | null
          created_at?: string
          fecha_atencion?: string | null
          fecha_reporte: string
          id?: string
          maquinaria_id?: string | null
          notas_resolucion?: string | null
          observacion?: string
          parte_diario_id: string
        }
        Update: {
          atendida?: boolean
          atendida_por?: string | null
          created_at?: string
          fecha_atencion?: string | null
          fecha_reporte?: string
          id?: string
          maquinaria_id?: string | null
          notas_resolucion?: string | null
          observacion?: string
          parte_diario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observaciones_maquina_estado_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_maquina_estado_parte_diario_id_fkey"
            columns: ["parte_diario_id"]
            isOneToOne: true
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_compra_items: {
        Row: {
          articulo: string | null
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          orden: number
          orden_id: string
          precio_unitario: number
          subtotal: number
          unidad: string
        }
        Insert: {
          articulo?: string | null
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          orden?: number
          orden_id: string
          precio_unitario?: number
          subtotal?: number
          unidad?: string
        }
        Update: {
          articulo?: string | null
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          orden_id?: string
          precio_unitario?: number
          subtotal?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "orden_compra_items_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          condiciones_pago: string | null
          created_at: string
          estado: string
          fecha: string
          fecha_entrega_estimada: string | null
          id: string
          incluir_iva: boolean
          iva: number
          iva_porcentaje: number
          maquinaria_id: string | null
          moneda: string
          numero: string
          numero_factura: string | null
          obra_id: string | null
          observaciones: string | null
          percepcion_iibb: number
          percepcion_iva: number
          proveedor_id: string | null
          sector: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          condiciones_pago?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          fecha_entrega_estimada?: string | null
          id?: string
          incluir_iva?: boolean
          iva?: number
          iva_porcentaje?: number
          maquinaria_id?: string | null
          moneda?: string
          numero: string
          numero_factura?: string | null
          obra_id?: string | null
          observaciones?: string | null
          percepcion_iibb?: number
          percepcion_iva?: number
          proveedor_id?: string | null
          sector?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          condiciones_pago?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          fecha_entrega_estimada?: string | null
          id?: string
          incluir_iva?: boolean
          iva?: number
          iva_porcentaje?: number
          maquinaria_id?: string | null
          moneda?: string
          numero?: string
          numero_factura?: string | null
          obra_id?: string | null
          observaciones?: string | null
          percepcion_iibb?: number
          percepcion_iva?: number
          proveedor_id?: string | null
          sector?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      otros_gastos: {
        Row: {
          categoria: string
          comprobante: string | null
          created_at: string
          descripcion: string
          fecha: string
          id: string
          maquinaria_id: string | null
          monto: number
          obra_id: string | null
          observaciones: string | null
          proveedor: string | null
          sector: string | null
          updated_at: string
        }
        Insert: {
          categoria: string
          comprobante?: string | null
          created_at?: string
          descripcion: string
          fecha: string
          id?: string
          maquinaria_id?: string | null
          monto?: number
          obra_id?: string | null
          observaciones?: string | null
          proveedor?: string | null
          sector?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          comprobante?: string | null
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          maquinaria_id?: string | null
          monto?: number
          obra_id?: string | null
          observaciones?: string | null
          proveedor?: string | null
          sector?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "otros_gastos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "otros_gastos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      partes_diarios: {
        Row: {
          ausencias: string[] | null
          cantidad_movimiento_interno: number | null
          cantidad_viajes: number | null
          check_aceite_hidraulico: boolean | null
          check_aceite_motor: boolean | null
          check_filtro_aire: boolean | null
          check_liquido_refrigerante: boolean | null
          check_uria: boolean | null
          combustible: number | null
          created_at: string | null
          estado: string
          estado_maquina: string | null
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          horometro_fin: number | null
          horometro_inicio: number | null
          id: string
          km_camion: number | null
          maquinaria_id: string | null
          novedades: string | null
          obra_id: string | null
          observacion_maquina: string | null
          observaciones_inconvenientes: string | null
          personal_id: string
          tareas: string | null
          updated_at: string | null
        }
        Insert: {
          ausencias?: string[] | null
          cantidad_movimiento_interno?: number | null
          cantidad_viajes?: number | null
          check_aceite_hidraulico?: boolean | null
          check_aceite_motor?: boolean | null
          check_filtro_aire?: boolean | null
          check_liquido_refrigerante?: boolean | null
          check_uria?: boolean | null
          combustible?: number | null
          created_at?: string | null
          estado?: string
          estado_maquina?: string | null
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          horometro_fin?: number | null
          horometro_inicio?: number | null
          id?: string
          km_camion?: number | null
          maquinaria_id?: string | null
          novedades?: string | null
          obra_id?: string | null
          observacion_maquina?: string | null
          observaciones_inconvenientes?: string | null
          personal_id: string
          tareas?: string | null
          updated_at?: string | null
        }
        Update: {
          ausencias?: string[] | null
          cantidad_movimiento_interno?: number | null
          cantidad_viajes?: number | null
          check_aceite_hidraulico?: boolean | null
          check_aceite_motor?: boolean | null
          check_filtro_aire?: boolean | null
          check_liquido_refrigerante?: boolean | null
          check_uria?: boolean | null
          combustible?: number | null
          created_at?: string | null
          estado?: string
          estado_maquina?: string | null
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          horometro_fin?: number | null
          horometro_inicio?: number | null
          id?: string
          km_camion?: number | null
          maquinaria_id?: string | null
          novedades?: string | null
          obra_id?: string | null
          observacion_maquina?: string | null
          observaciones_inconvenientes?: string | null
          personal_id?: string
          tareas?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partes_diarios_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          activo: boolean
          apellido: string | null
          banco: string | null
          created_at: string
          dni: string | null
          email: string | null
          estado_laboral: string | null
          fecha_alta: string | null
          fecha_baja: string | null
          fecha_ingreso: string | null
          id: string
          legajo: string | null
          licencia: string | null
          modalidad_pago: string | null
          nombre: string | null
          numero_cuenta: string | null
          observaciones: string | null
          puesto: string | null
          rol: Database["public"]["Enums"]["rol_personal"]
          sector: string | null
          situacion_laboral: string | null
          sueldo: number | null
          sueldo_negro: number | null
          telefono: string | null
          updated_at: string
          user_id: string | null
          vencimiento_licencia: string | null
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          banco?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          estado_laboral?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          fecha_ingreso?: string | null
          id?: string
          legajo?: string | null
          licencia?: string | null
          modalidad_pago?: string | null
          nombre?: string | null
          numero_cuenta?: string | null
          observaciones?: string | null
          puesto?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"]
          sector?: string | null
          situacion_laboral?: string | null
          sueldo?: number | null
          sueldo_negro?: number | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
          vencimiento_licencia?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          banco?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          estado_laboral?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          fecha_ingreso?: string | null
          id?: string
          legajo?: string | null
          licencia?: string | null
          modalidad_pago?: string | null
          nombre?: string | null
          numero_cuenta?: string | null
          observaciones?: string | null
          puesto?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"]
          sector?: string | null
          situacion_laboral?: string | null
          sueldo?: number | null
          sueldo_negro?: number | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
          vencimiento_licencia?: string | null
        }
        Relationships: []
      }
      precios_productos_mes: {
        Row: {
          anio: number
          created_at: string
          id: string
          mes: number
          precio_unitario: number
          producto: string
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          id?: string
          mes: number
          precio_unitario?: number
          producto: string
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          id?: string
          mes?: number
          precio_unitario?: number
          producto?: string
          updated_at?: string
        }
        Relationships: []
      }
      prestamo_cuotas: {
        Row: {
          aplicada_at: string | null
          created_at: string
          estado: Database["public"]["Enums"]["cuota_estado"]
          id: string
          liquidacion_id: string | null
          monto: number
          numero_cuota: number
          prestamo_id: string
          updated_at: string
        }
        Insert: {
          aplicada_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["cuota_estado"]
          id?: string
          liquidacion_id?: string | null
          monto: number
          numero_cuota: number
          prestamo_id: string
          updated_at?: string
        }
        Update: {
          aplicada_at?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["cuota_estado"]
          id?: string
          liquidacion_id?: string | null
          monto?: number
          numero_cuota?: number
          prestamo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestamo_cuotas_liquidacion_id_fkey"
            columns: ["liquidacion_id"]
            isOneToOne: false
            referencedRelation: "liquidaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestamo_cuotas_prestamo_id_fkey"
            columns: ["prestamo_id"]
            isOneToOne: false
            referencedRelation: "prestamos_personal"
            referencedColumns: ["id"]
          },
        ]
      }
      prestamos_personal: {
        Row: {
          cantidad_cuotas: number
          created_at: string
          estado: Database["public"]["Enums"]["prestamo_estado"]
          fecha: string
          id: string
          monto_cuota: number
          monto_total: number
          motivo: string | null
          personal_id: string
          updated_at: string
        }
        Insert: {
          cantidad_cuotas: number
          created_at?: string
          estado?: Database["public"]["Enums"]["prestamo_estado"]
          fecha?: string
          id?: string
          monto_cuota: number
          monto_total: number
          motivo?: string | null
          personal_id: string
          updated_at?: string
        }
        Update: {
          cantidad_cuotas?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["prestamo_estado"]
          fecha?: string
          id?: string
          monto_cuota?: number
          monto_total?: number
          motivo?: string | null
          personal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestamos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestamos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestamos_personal_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nombre_completo: string
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre_completo: string
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre_completo?: string
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean
          contacto: string | null
          created_at: string
          cuit: string | null
          direccion: string | null
          email: string | null
          id: string
          localidad: string | null
          nombre: string
          observaciones: string | null
          rubro: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          observaciones?: string | null
          rubro?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          observaciones?: string | null
          rubro?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registros_hh: {
        Row: {
          capataz_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_presentismo"]
          fecha: string
          hora_entrada: string
          hora_salida: string
          horas_extra: number
          horas_normales: number
          horas_totales: number
          id: string
          obra_id: string
          observaciones: string | null
          persona_id: string
          tarea: string
          updated_at: string
        }
        Insert: {
          capataz_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_presentismo"]
          fecha: string
          hora_entrada: string
          hora_salida: string
          horas_extra?: number
          horas_normales?: number
          horas_totales?: number
          id?: string
          obra_id: string
          observaciones?: string | null
          persona_id: string
          tarea: string
          updated_at?: string
        }
        Update: {
          capataz_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_presentismo"]
          fecha?: string
          hora_entrada?: string
          hora_salida?: string
          horas_extra?: number
          horas_normales?: number
          horas_totales?: number
          id?: string
          obra_id?: string
          observaciones?: string | null
          persona_id?: string
          tarea?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_hh_capataz_id_fkey"
            columns: ["capataz_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_capataz_id_fkey"
            columns: ["capataz_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_capataz_id_fkey"
            columns: ["capataz_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      remito_items: {
        Row: {
          cantidad: number
          concepto: string
          created_at: string
          id: string
          observaciones: string | null
          orden: number
          precio_total: number
          precio_unitario: number
          remito_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          concepto?: string
          created_at?: string
          id?: string
          observaciones?: string | null
          orden?: number
          precio_total?: number
          precio_unitario?: number
          remito_id: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          concepto?: string
          created_at?: string
          id?: string
          observaciones?: string | null
          orden?: number
          precio_total?: number
          precio_unitario?: number
          remito_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remito_items_remito_id_fkey"
            columns: ["remito_id"]
            isOneToOne: false
            referencedRelation: "remitos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remito_items_remito_id_fkey"
            columns: ["remito_id"]
            isOneToOne: false
            referencedRelation: "remitos_list_view"
            referencedColumns: ["id"]
          },
        ]
      }
      remitos: {
        Row: {
          cantidad: number
          cantidad_uni: number | null
          cantidad_viajes: number | null
          cliente: string | null
          cliente_cantera: string | null
          cliente_destino: string | null
          created_at: string
          created_by: string | null
          desde: string | null
          evidencia_url: string | null
          fecha: string
          firmado: boolean
          forma_pago: string | null
          hasta: string | null
          id: string
          maquinaria_id: string | null
          material: string
          numero: string
          obra_id: string | null
          observaciones: string | null
          orden: number | null
          patente_tercero: string | null
          precio_calc_mode: string | null
          precio_total: number | null
          precio_unitario: number | null
          proveedor: string | null
          recibido_por: string
          remito_local: string | null
          remito_tercero: string | null
          row_color: string | null
          tipo_material: string | null
          tipo_transporte: string | null
          unidad: string
          updated_at: string
          viaje_id: string | null
        }
        Insert: {
          cantidad: number
          cantidad_uni?: number | null
          cantidad_viajes?: number | null
          cliente?: string | null
          cliente_cantera?: string | null
          cliente_destino?: string | null
          created_at?: string
          created_by?: string | null
          desde?: string | null
          evidencia_url?: string | null
          fecha: string
          firmado?: boolean
          forma_pago?: string | null
          hasta?: string | null
          id?: string
          maquinaria_id?: string | null
          material: string
          numero: string
          obra_id?: string | null
          observaciones?: string | null
          orden?: number | null
          patente_tercero?: string | null
          precio_calc_mode?: string | null
          precio_total?: number | null
          precio_unitario?: number | null
          proveedor?: string | null
          recibido_por: string
          remito_local?: string | null
          remito_tercero?: string | null
          row_color?: string | null
          tipo_material?: string | null
          tipo_transporte?: string | null
          unidad: string
          updated_at?: string
          viaje_id?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_uni?: number | null
          cantidad_viajes?: number | null
          cliente?: string | null
          cliente_cantera?: string | null
          cliente_destino?: string | null
          created_at?: string
          created_by?: string | null
          desde?: string | null
          evidencia_url?: string | null
          fecha?: string
          firmado?: boolean
          forma_pago?: string | null
          hasta?: string | null
          id?: string
          maquinaria_id?: string | null
          material?: string
          numero?: string
          obra_id?: string | null
          observaciones?: string | null
          orden?: number | null
          patente_tercero?: string | null
          precio_calc_mode?: string | null
          precio_total?: number | null
          precio_unitario?: number | null
          proveedor?: string | null
          recibido_por?: string
          remito_local?: string | null
          remito_tercero?: string | null
          row_color?: string | null
          tipo_material?: string | null
          tipo_transporte?: string | null
          unidad?: string
          updated_at?: string
          viaje_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remitos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      rrhh_feriados: {
        Row: {
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          fecha: string
          id?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
        }
        Relationships: []
      }
      rrhh_jornada_config: {
        Row: {
          domingo: number
          id: string
          jueves: number
          lunes: number
          martes: number
          miercoles: number
          sabado: number
          updated_at: string
          viernes: number
        }
        Insert: {
          domingo?: number
          id?: string
          jueves?: number
          lunes?: number
          martes?: number
          miercoles?: number
          sabado?: number
          updated_at?: string
          viernes?: number
        }
        Update: {
          domingo?: number
          id?: string
          jueves?: number
          lunes?: number
          martes?: number
          miercoles?: number
          sabado?: number
          updated_at?: string
          viernes?: number
        }
        Relationships: []
      }
      rrhh_novedades: {
        Row: {
          created_at: string
          created_by: string | null
          dias: number | null
          fecha: string | null
          fecha_desde: string | null
          fecha_hasta: string | null
          horas: number | null
          id: string
          monto: number | null
          observacion: string | null
          periodo_id: string | null
          personal_id: string
          tipo: Database["public"]["Enums"]["rrhh_novedad_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dias?: number | null
          fecha?: string | null
          fecha_desde?: string | null
          fecha_hasta?: string | null
          horas?: number | null
          id?: string
          monto?: number | null
          observacion?: string | null
          periodo_id?: string | null
          personal_id: string
          tipo: Database["public"]["Enums"]["rrhh_novedad_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dias?: number | null
          fecha?: string | null
          fecha_desde?: string | null
          fecha_hasta?: string | null
          horas?: number | null
          id?: string
          monto?: number | null
          observacion?: string | null
          periodo_id?: string | null
          personal_id?: string
          tipo?: Database["public"]["Enums"]["rrhh_novedad_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rrhh_novedades_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "rrhh_periodos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rrhh_novedades_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rrhh_novedades_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rrhh_novedades_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      rrhh_periodos: {
        Row: {
          anio: number
          created_at: string
          estado: Database["public"]["Enums"]["rrhh_periodo_estado"]
          fecha_desde: string
          fecha_hasta: string
          horas_normales: number
          id: string
          mes: number
          observaciones: string | null
          tipo: Database["public"]["Enums"]["rrhh_periodo_tipo"]
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          estado?: Database["public"]["Enums"]["rrhh_periodo_estado"]
          fecha_desde: string
          fecha_hasta: string
          horas_normales?: number
          id?: string
          mes: number
          observaciones?: string | null
          tipo: Database["public"]["Enums"]["rrhh_periodo_tipo"]
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          estado?: Database["public"]["Enums"]["rrhh_periodo_estado"]
          fecha_desde?: string
          fecha_hasta?: string
          horas_normales?: number
          id?: string
          mes?: number
          observaciones?: string | null
          tipo?: Database["public"]["Enums"]["rrhh_periodo_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      rrhh_sueldos_historial: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          modalidad: string
          observacion: string | null
          personal_id: string
          sueldo_acordado: number
          sueldo_registrado: number
          updated_at: string
          vigencia_desde: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          modalidad?: string
          observacion?: string | null
          personal_id: string
          sueldo_acordado?: number
          sueldo_registrado?: number
          updated_at?: string
          vigencia_desde: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          modalidad?: string
          observacion?: string | null
          personal_id?: string
          sueldo_acordado?: number
          sueldo_registrado?: number
          updated_at?: string
          vigencia_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "rrhh_sueldos_historial_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rrhh_sueldos_historial_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rrhh_sueldos_historial_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          activo: boolean
          categoria: Database["public"]["Enums"]["categoria_stock"]
          codigo: string
          created_at: string
          id: string
          nombre: string
          precio_unitario: number
          stock_actual: number
          stock_maximo: number | null
          stock_minimo: number
          ubicacion: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria: Database["public"]["Enums"]["categoria_stock"]
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          precio_unitario: number
          stock_actual?: number
          stock_maximo?: number | null
          stock_minimo: number
          ubicacion: string
          unidad: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_stock"]
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          precio_unitario?: number
          stock_actual?: number
          stock_maximo?: number | null
          stock_minimo?: number
          ubicacion?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      sueldos: {
        Row: {
          apellido: string | null
          created_at: string
          id: string
          legajo: string
          modalidad_pago: string
          nombre: string | null
          periodo: string
          personal_id: string | null
          puesto: string | null
          sueldo_blanco: number
          sueldo_negro: number
          updated_at: string
        }
        Insert: {
          apellido?: string | null
          created_at?: string
          id?: string
          legajo: string
          modalidad_pago?: string
          nombre?: string | null
          periodo: string
          personal_id?: string | null
          puesto?: string | null
          sueldo_blanco?: number
          sueldo_negro?: number
          updated_at?: string
        }
        Update: {
          apellido?: string | null
          created_at?: string
          id?: string
          legajo?: string
          modalidad_pago?: string
          nombre?: string | null
          periodo?: string
          personal_id?: string | null
          puesto?: string | null
          sueldo_blanco?: number
          sueldo_negro?: number
          updated_at?: string
        }
        Relationships: []
      }
      tablero_sesiones: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mes: string
          metrica: string
          nombre: string
          obra_activa: string | null
          obra_ids: string[]
          refresh_token: number
          rotacion_activa: boolean
          rotacion_segundos: number
          tv_ping_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes?: string
          metrica?: string
          nombre?: string
          obra_activa?: string | null
          obra_ids?: string[]
          refresh_token?: number
          rotacion_activa?: boolean
          rotacion_segundos?: number
          tv_ping_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes?: string
          metrica?: string
          nombre?: string
          obra_activa?: string | null
          obra_ids?: string[]
          refresh_token?: number
          rotacion_activa?: boolean
          rotacion_segundos?: number
          tv_ping_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacaciones: {
        Row: {
          aprobado_por: string | null
          created_at: string
          dias_totales: number
          fecha_aprobacion: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string
          observaciones: string | null
          pagada: boolean
          personal_id: string
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string
          dias_totales: number
          fecha_aprobacion?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo?: string
          observaciones?: string | null
          pagada?: boolean
          personal_id: string
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string
          dias_totales?: number
          fecha_aprobacion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string
          observaciones?: string | null
          pagada?: boolean
          personal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacaciones_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      viajes: {
        Row: {
          camion_id: string
          chofer_id: string
          created_at: string
          destino: string
          estado: Database["public"]["Enums"]["estado_viaje"]
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          km_recorridos: number | null
          material: string
          obra_id: string
          observaciones: string | null
          origen: string
          updated_at: string
          volumen: number
        }
        Insert: {
          camion_id: string
          chofer_id: string
          created_at?: string
          destino: string
          estado?: Database["public"]["Enums"]["estado_viaje"]
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          km_recorridos?: number | null
          material: string
          obra_id: string
          observaciones?: string | null
          origen: string
          updated_at?: string
          volumen: number
        }
        Update: {
          camion_id?: string
          chofer_id?: string
          created_at?: string
          destino?: string
          estado?: Database["public"]["Enums"]["estado_viaje"]
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          km_recorridos?: number | null
          material?: string
          obra_id?: string
          observaciones?: string | null
          origen?: string
          updated_at?: string
          volumen?: number
        }
        Relationships: [
          {
            foreignKeyName: "viajes_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mantenimientos_list_view: {
        Row: {
          adjunto_url: string | null
          alerta_campo: string | null
          checklist_cambio: Json | null
          checklist_chequeo: Json | null
          costo_mano_obra: number | null
          costo_repuestos: number | null
          costo_total: number | null
          created_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_mantenimiento"] | null
          fecha: string | null
          horas_maquina: number | null
          id: string | null
          informe_tecnico: string | null
          kilometros: number | null
          maquinaria_codigo: string | null
          maquinaria_horas_acumuladas: number | null
          maquinaria_id: string | null
          maquinaria_nombre: string | null
          observacion_reporte_id: string | null
          observaciones: string | null
          proximo_mantenimiento: string | null
          proximo_service_hr: number | null
          proximo_service_km: number | null
          repuestos: string | null
          tecnico: string | null
          tecnico_apellido: string | null
          tecnico_id: string | null
          tecnico_nombre: string | null
          tipo: Database["public"]["Enums"]["tipo_mantenimiento"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_observacion_reporte_id_fkey"
            columns: ["observacion_reporte_id"]
            isOneToOne: false
            referencedRelation: "observaciones_maquina_estado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mantenimientos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_legajo_lookup: {
        Row: {
          id: string | null
          legajo: string | null
          rol: Database["public"]["Enums"]["rol_personal"] | null
          ya_vinculado: boolean | null
        }
        Insert: {
          id?: string | null
          legajo?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          ya_vinculado?: never
        }
        Update: {
          id?: string | null
          legajo?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          ya_vinculado?: never
        }
        Relationships: []
      }
      personal_selector: {
        Row: {
          activo: boolean | null
          apellido: string | null
          id: string | null
          legajo: string | null
          nombre: string | null
          rol: Database["public"]["Enums"]["rol_personal"] | null
          user_id: string | null
        }
        Insert: {
          activo?: boolean | null
          apellido?: string | null
          id?: string | null
          legajo?: string | null
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean | null
          apellido?: string | null
          id?: string | null
          legajo?: string | null
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      remitos_list_view: {
        Row: {
          cantidad: number | null
          cantidad_uni: number | null
          cantidad_viajes: number | null
          cliente: string | null
          cliente_cantera: string | null
          cliente_destino: string | null
          created_at: string | null
          created_by: string | null
          desde: string | null
          evidencia_url: string | null
          fecha: string | null
          firmado: boolean | null
          forma_pago: string | null
          hasta: string | null
          id: string | null
          maquinaria_codigo: string | null
          maquinaria_id: string | null
          maquinaria_patente: string | null
          material: string | null
          numero: string | null
          obra_id: string | null
          obra_nombre: string | null
          observaciones: string | null
          patente_tercero: string | null
          precio_calc_mode: string | null
          precio_total: number | null
          precio_unitario: number | null
          proveedor: string | null
          recibido_por: string | null
          remito_local: string | null
          remito_tercero: string | null
          row_color: string | null
          tipo_material: string | null
          tipo_transporte: string | null
          unidad: string | null
          updated_at: string | null
          viaje_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remitos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_mantenimientos: { Args: { _user_id: string }; Returns: boolean }
      can_view_remitos: { Args: { _user_id: string }; Returns: boolean }
      contab_generar_asiento_cbte: {
        Args: { _cbte_id: string }
        Returns: string
      }
      contab_generar_asiento_pago: {
        Args: { _pago_id: string }
        Returns: string
      }
      execute_readonly_query: { Args: { query_sql: string }; Returns: Json }
      get_documento_signed_url: {
        Args: { _documento_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invoke_edge_function: {
        Args: { _function_name: string; _payload: Json }
        Returns: number
      }
      is_personal_legajo_available: {
        Args: { p_legajo: string }
        Returns: boolean
      }
      is_owner_of_personal: {
        Args: { _personal_id: string; _user_id: string }
        Returns: boolean
      }
      is_personal_capataz: { Args: { _user_id: string }; Returns: boolean }
      is_personal_mecanico: { Args: { _user_id: string }; Returns: boolean }
      link_personal_to_user: {
        Args: { p_legajo: string; p_user_id: string }
        Returns: {
          error_message: string
          personal_id: string
          rol: Database["public"]["Enums"]["rol_personal"]
          success: boolean
        }[]
      }
      map_personal_rol_to_app_role: {
        Args: { _rol: Database["public"]["Enums"]["rol_personal"] }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      adelanto_estado: "pendiente" | "aplicado" | "cancelado"
      app_role:
        | "admin"
        | "capataz"
        | "maquinista"
        | "ayudante"
        | "remitero"
        | "contador"
      categoria_stock: "material" | "repuesto" | "herramienta" | "consumible"
      contab_cbte_estado:
        | "borrador"
        | "confirmado"
        | "anulado"
        | "pagado"
        | "parcial"
      contab_cbte_tipo:
        | "FA_A"
        | "FA_B"
        | "FA_C"
        | "NC_A"
        | "NC_B"
        | "NC_C"
        | "ND_A"
        | "ND_B"
        | "ND_C"
        | "RECIBO"
        | "TICKET"
        | "FA_CPA_A"
        | "FA_CPA_B"
        | "FA_CPA_C"
        | "NC_CPA"
        | "ND_CPA"
        | "OTRO"
      contab_cond_iva: "RI" | "MT" | "EX" | "CF" | "NR"
      contab_cuenta_tipo:
        | "activo"
        | "pasivo"
        | "patrimonio"
        | "ingreso"
        | "egreso"
        | "resultado"
      contab_pago_medio:
        | "efectivo"
        | "transferencia"
        | "cheque"
        | "tarjeta"
        | "deposito"
        | "otro"
      contab_tercero_tipo: "cliente" | "proveedor" | "ambos"
      cuota_estado: "pendiente" | "aplicada"
      estado_certificado: "borrador" | "emitido" | "cobrado"
      estado_cotizacion:
        | "borrador"
        | "enviada"
        | "aprobada"
        | "rechazada"
        | "vencida"
      estado_mantenimiento:
        | "programado"
        | "en_proceso"
        | "completado"
        | "pendiente"
      estado_maquinaria: "operativa" | "mantenimiento" | "inactiva" | "en_uso"
      estado_obra: "activa" | "pendiente" | "finalizada" | "pausada"
      estado_presentismo:
        | "presente"
        | "ausente"
        | "licencia"
        | "vacaciones"
        | "enfermedad"
      estado_viaje: "programado" | "en_curso" | "completado" | "cancelado"
      liquidacion_estado: "borrador" | "cerrada" | "pagada"
      liquidacion_modalidad: "mensual" | "quincenal" | "ambas"
      liquidacion_periodo: "quincena_1" | "quincena_2" | "mes"
      prestamo_estado: "activo" | "saldado" | "cancelado"
      rol_personal:
        | "capataz"
        | "maquinista"
        | "chofer"
        | "administrativo"
        | "ayudante"
        | "sereno"
        | "mecanico"
        | "topografo"
        | "repartidor_calecita"
      rrhh_novedad_tipo:
        | "inasistencia"
        | "enfermedad"
        | "art"
        | "vacaciones"
        | "licencia"
        | "horas_extras"
        | "feriado_trabajado"
        | "premio"
        | "adelanto"
        | "alta"
        | "baja"
        | "cambio_sueldo"
        | "otro"
      rrhh_periodo_estado: "abierto" | "revision" | "cerrado"
      rrhh_periodo_tipo: "quincena_1" | "quincena_2" | "mes"
      tipo_documento_empleado: "estudio_medico" | "recibo_sueldo"
      tipo_mantenimiento: "preventivo" | "correctivo" | "emergencia"
      tipo_maquinaria:
        | "cargadora"
        | "compactador"
        | "retroexcavadora"
        | "minicargadora"
        | "motoniveladora"
        | "topador"
        | "pala_retro"
        | "batea"
        | "acoplado"
        | "camion"
        | "carreton"
        | "cisterna"
        | "tanque_cisterna"
        | "tanque_regador_tractor"
        | "soplador"
        | "zanjeadora"
        | "rastra"
        | "tractor"
        | "rastra_grosspal"
        | "auto"
        | "camioneta"
        | "grupo_electrogeno"
      tipo_movimiento_stock: "entrada" | "salida" | "ajuste"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adelanto_estado: ["pendiente", "aplicado", "cancelado"],
      app_role: [
        "admin",
        "capataz",
        "maquinista",
        "ayudante",
        "remitero",
        "contador",
      ],
      categoria_stock: ["material", "repuesto", "herramienta", "consumible"],
      contab_cbte_estado: [
        "borrador",
        "confirmado",
        "anulado",
        "pagado",
        "parcial",
      ],
      contab_cbte_tipo: [
        "FA_A",
        "FA_B",
        "FA_C",
        "NC_A",
        "NC_B",
        "NC_C",
        "ND_A",
        "ND_B",
        "ND_C",
        "RECIBO",
        "TICKET",
        "FA_CPA_A",
        "FA_CPA_B",
        "FA_CPA_C",
        "NC_CPA",
        "ND_CPA",
        "OTRO",
      ],
      contab_cond_iva: ["RI", "MT", "EX", "CF", "NR"],
      contab_cuenta_tipo: [
        "activo",
        "pasivo",
        "patrimonio",
        "ingreso",
        "egreso",
        "resultado",
      ],
      contab_pago_medio: [
        "efectivo",
        "transferencia",
        "cheque",
        "tarjeta",
        "deposito",
        "otro",
      ],
      contab_tercero_tipo: ["cliente", "proveedor", "ambos"],
      cuota_estado: ["pendiente", "aplicada"],
      estado_certificado: ["borrador", "emitido", "cobrado"],
      estado_cotizacion: [
        "borrador",
        "enviada",
        "aprobada",
        "rechazada",
        "vencida",
      ],
      estado_mantenimiento: [
        "programado",
        "en_proceso",
        "completado",
        "pendiente",
      ],
      estado_maquinaria: ["operativa", "mantenimiento", "inactiva", "en_uso"],
      estado_obra: ["activa", "pendiente", "finalizada", "pausada"],
      estado_presentismo: [
        "presente",
        "ausente",
        "licencia",
        "vacaciones",
        "enfermedad",
      ],
      estado_viaje: ["programado", "en_curso", "completado", "cancelado"],
      liquidacion_estado: ["borrador", "cerrada", "pagada"],
      liquidacion_modalidad: ["mensual", "quincenal", "ambas"],
      liquidacion_periodo: ["quincena_1", "quincena_2", "mes"],
      prestamo_estado: ["activo", "saldado", "cancelado"],
      rol_personal: [
        "capataz",
        "maquinista",
        "chofer",
        "administrativo",
        "ayudante",
        "sereno",
        "mecanico",
        "topografo",
        "repartidor_calecita",
      ],
      rrhh_novedad_tipo: [
        "inasistencia",
        "enfermedad",
        "art",
        "vacaciones",
        "licencia",
        "horas_extras",
        "feriado_trabajado",
        "premio",
        "adelanto",
        "alta",
        "baja",
        "cambio_sueldo",
        "otro",
      ],
      rrhh_periodo_estado: ["abierto", "revision", "cerrado"],
      rrhh_periodo_tipo: ["quincena_1", "quincena_2", "mes"],
      tipo_documento_empleado: ["estudio_medico", "recibo_sueldo"],
      tipo_mantenimiento: ["preventivo", "correctivo", "emergencia"],
      tipo_maquinaria: [
        "cargadora",
        "compactador",
        "retroexcavadora",
        "minicargadora",
        "motoniveladora",
        "topador",
        "pala_retro",
        "batea",
        "acoplado",
        "camion",
        "carreton",
        "cisterna",
        "tanque_cisterna",
        "tanque_regador_tractor",
        "soplador",
        "zanjeadora",
        "rastra",
        "tractor",
        "rastra_grosspal",
        "auto",
        "camioneta",
        "grupo_electrogeno",
      ],
      tipo_movimiento_stock: ["entrada", "salida", "ajuste"],
    },
  },
} as const
