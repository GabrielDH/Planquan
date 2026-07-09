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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      catalog_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          id: string
          user_id: string
          code: string | null
          name: string
          category_id: string | null
          unit_of_measure: string
          unit_price: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code?: string | null
          name: string
          category_id?: string | null
          unit_of_measure: string
          unit_price?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string | null
          name?: string
          category_id?: string | null
          unit_of_measure?: string
          unit_price?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      derived_measurements: {
        Row: {
          id: string
          source_measurement_id: string
          derived_measurement_id: string
          action_type: string
          parameters: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_measurement_id: string
          derived_measurement_id: string
          action_type: string
          parameters?: Json
          created_at?: string
        }
        Update: {
          id?: string
          source_measurement_id?: string
          derived_measurement_id?: string
          action_type?: string
          parameters?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "derived_measurements_source_measurement_id_fkey"
            columns: ["source_measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "derived_measurements_derived_measurement_id_fkey"
            columns: ["derived_measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_item_assignments: {
        Row: {
          id: string
          measurement_id: string
          catalog_item_id: string
          conversion_factor: number
          quantity: number | null
          estimated_cost: number | null
          waste_factor: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          measurement_id: string
          catalog_item_id: string
          conversion_factor?: number
          quantity?: number | null
          estimated_cost?: number | null
          waste_factor?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          measurement_id?: string
          catalog_item_id?: string
          conversion_factor?: number
          quantity?: number | null
          estimated_cost?: number | null
          waste_factor?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_item_assignments_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_item_assignments_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          color: string | null
          comment: string | null
          coordinates: Json
          created_at: string
          file_id: string
          id: string
          label: string | null
          measurement_type: string
          original_unit: string | null
          original_value: number | null
          page_number: number
          project_id: string
          unit: string | null
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          color?: string | null
          comment?: string | null
          coordinates?: Json
          created_at?: string
          file_id: string
          id?: string
          label?: string | null
          measurement_type: string
          original_unit?: string | null
          original_value?: number | null
          page_number?: number
          project_id: string
          unit?: string | null
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          color?: string | null
          comment?: string | null
          coordinates?: Json
          created_at?: string
          file_id?: string
          id?: string
          label?: string | null
          measurement_type?: string
          original_unit?: string | null
          original_value?: number | null
          page_number?: number
          project_id?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      page_scales: {
        Row: {
          calibrated_by: string
          created_at: string
          file_id: string
          id: string
          page_number: number
          pixels_per_unit: number
          point1_x: number | null
          point1_y: number | null
          point2_x: number | null
          point2_y: number | null
          real_distance: number | null
          real_distance_unit: string | null
          scale_type: string
          standard_scale: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          calibrated_by: string
          created_at?: string
          file_id: string
          id?: string
          page_number?: number
          pixels_per_unit: number
          point1_x?: number | null
          point1_y?: number | null
          point2_x?: number | null
          point2_y?: number | null
          real_distance?: number | null
          real_distance_unit?: string | null
          scale_type: string
          standard_scale?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          calibrated_by?: string
          created_at?: string
          file_id?: string
          id?: string
          page_number?: number
          pixels_per_unit?: number
          point1_x?: number | null
          point1_y?: number | null
          point2_x?: number | null
          point2_y?: number | null
          real_distance?: number | null
          real_distance_unit?: string | null
          scale_type?: string
          standard_scale?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_scales_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          number_format: string
          preferred_currency: string
          preferred_units: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          number_format?: string
          preferred_currency?: string
          preferred_units?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          number_format?: string
          preferred_currency?: string
          preferred_units?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          current_revision: string | null
          derived_storage_path: string | null
          file_name: string
          file_size: number
          file_type: string
          folder: string | null
          id: string
          notes: string | null
          original_file_name: string
          project_id: string
          sheet_label: string | null
          storage_path: string
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_revision?: string | null
          derived_storage_path?: string | null
          file_name: string
          file_size: number
          file_type: string
          folder?: string | null
          id?: string
          notes?: string | null
          original_file_name: string
          project_id: string
          sheet_label?: string | null
          storage_path: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_revision?: string | null
          derived_storage_path?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          folder?: string | null
          id?: string
          notes?: string | null
          original_file_name?: string
          project_id?: string
          sheet_label?: string | null
          storage_path?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string
          force_approved: boolean | null
          id: string
          levels: number | null
          location: string | null
          name: string
          notes: string | null
          number_format: string
          project_type: string
          regional_template: string
          status: string
          total_area: number | null
          total_area_unit: string | null
          typical_height: number | null
          typical_height_unit: string | null
          unit_system: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          force_approved?: boolean | null
          id?: string
          levels?: number | null
          location?: string | null
          name: string
          notes?: string | null
          number_format?: string
          project_type?: string
          regional_template?: string
          status?: string
          total_area?: number | null
          total_area_unit?: string | null
          typical_height?: number | null
          typical_height_unit?: string | null
          unit_system?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          force_approved?: boolean | null
          id?: string
          levels?: number | null
          location?: string | null
          name?: string
          notes?: string | null
          number_format?: string
          project_type?: string
          regional_template?: string
          status?: string
          total_area?: number | null
          total_area_unit?: string | null
          typical_height?: number | null
          typical_height_unit?: string | null
          unit_system?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quality_gate_results: {
        Row: {
          id: string
          project_id: string
          executed_by: string
          passed: boolean
          results: Json
          force_approved: boolean | null
          force_comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          executed_by: string
          passed: boolean
          results?: Json
          force_approved?: boolean | null
          force_comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          executed_by?: string
          passed?: boolean
          results?: Json
          force_approved?: boolean | null
          force_comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_gate_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
