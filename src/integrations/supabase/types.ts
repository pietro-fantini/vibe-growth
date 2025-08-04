export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      goal_progress: {
        Row: {
          completed_count: number
          created_at: string
          goal_id: string
          id: string
          period: string
          updated_at: string
        }
        Insert: {
          completed_count?: number
          created_at?: string
          goal_id: string
          id?: string
          period: string
          updated_at?: string
        }
        Update: {
          completed_count?: number
          created_at?: string
          goal_id?: string
          id?: string
          period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "current_goal_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_history"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          background_color: string | null
          created_at: string
          end_date: string | null
          frequency: string | null
          id: string
          is_active: boolean
          start_date: string
          target_count: number
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          start_date?: string
          target_count?: number
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          start_date?: string
          target_count?: number
          title?: string
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subgoal_progress: {
        Row: {
          completed_count: number
          created_at: string
          id: string
          period: string
          subgoal_id: string
          updated_at: string
        }
        Insert: {
          completed_count?: number
          created_at?: string
          id?: string
          period: string
          subgoal_id: string
          updated_at?: string
        }
        Update: {
          completed_count?: number
          created_at?: string
          id?: string
          period?: string
          subgoal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subgoals: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          is_active: boolean
          target_count: number
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          is_active?: boolean
          target_count?: number
          title: string
          type: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          is_active?: boolean
          target_count?: number
          title?: string
          type?: Database["public"]["Enums"]["goal_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_goal_progress: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          current_progress: number | null
          end_date: string | null
          frequency: string | null
          id: string | null
          is_active: boolean | null
          start_date: string | null
          target_count: number | null
          title: string | null
          type: Database["public"]["Enums"]["goal_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      current_subgoal_progress: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          current_progress: number | null
          goal_id: string | null
          id: string | null
          is_active: boolean | null
          title: string | null
          type: Database["public"]["Enums"]["goal_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      goal_history: {
        Row: {
          completed_count: number | null
          completion_percentage: number | null
          end_date: string | null
          frequency: string | null
          goal_id: string | null
          is_active: boolean | null
          period: string | null
          progress_created_at: string | null
          progress_updated_at: string | null
          start_date: string | null
          target_count: number | null
          title: string | null
          type: Database["public"]["Enums"]["goal_type"] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_subgoal_progress: {
        Args: { subgoal_uuid: string; decrement_by?: number }
        Returns: undefined
      }
      delete_subgoal_and_recalculate: {
        Args: { subgoal_uuid: string }
        Returns: undefined
      }
      get_current_period: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_subgoal_completion: {
        Args: { subgoal_uuid: string; increment_by?: number }
        Returns: undefined
      }
      handle_subgoal_decrement: {
        Args: { subgoal_uuid: string; decrement_by?: number }
        Returns: undefined
      }
      increment_goal_progress: {
        Args: { goal_uuid: string; increment_by?: number }
        Returns: {
          completed_count: number
          created_at: string
          goal_id: string
          id: string
          period: string
          updated_at: string
        }
      }
      increment_subgoal_progress: {
        Args: { subgoal_uuid: string; increment_by?: number }
        Returns: undefined
      }
      initialize_monthly_progress: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      recalculate_goal_progress: {
        Args: { goal_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      goal_type: "one_time" | "recurring"
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
    Enums: {
      goal_type: ["one_time", "recurring"],
    },
  },
} as const
