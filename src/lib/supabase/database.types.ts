
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "categories": {
                  Row: {
                    "default_severity": Database["public"]['Enums']["severity"],"group": Database["public"]['Enums']["category_group"],"icon": string,"id": string,"label": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "default_severity": Database["public"]['Enums']["severity"],"group": Database["public"]['Enums']["category_group"],"icon": string,"id": string,"label": string,"sort_order"?: number
                  }
                  Update: {
                    "default_severity"?: Database["public"]['Enums']["severity"],"group"?: Database["public"]['Enums']["category_group"],"icon"?: string,"id"?: string,"label"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"facilities": {
                  Row: {
                    "address": string,"capacity": number | null,"contact_phone": string | null,"created_at": string,"id": string,"location": unknown,"name": string,"status": Database["public"]['Enums']["facility_status"],"status_updated_at": string | null,"status_updated_by": string | null,"type": Database["public"]['Enums']["facility_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"capacity"?: number | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"location": unknown,"name": string,"status"?: Database["public"]['Enums']["facility_status"],"status_updated_at"?: string | null,"status_updated_by"?: string | null,"type": Database["public"]['Enums']["facility_type"]
                  }
                  Update: {
                    "address"?: string,"capacity"?: number | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"location"?: unknown,"name"?: string,"status"?: Database["public"]['Enums']["facility_status"],"status_updated_at"?: string | null,"status_updated_by"?: string | null,"type"?: Database["public"]['Enums']["facility_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "facilities_status_updated_by_fkey"
      columns: ["status_updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"incident_photos": {
                  Row: {
                    "created_at": string,"id": string,"incident_id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"incident_id": string,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"incident_id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incident_photos_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incident_photos_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents_public"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents": {
                  Row: {
                    "area": unknown,"category_id": string,"corroboration_count": number,"description": string,"id": string,"location": unknown,"location_accuracy_m": number | null,"place_name": string | null,"reported_at": string,"reporter_id": string,"severity": Database["public"]['Enums']["severity"],"status": Database["public"]['Enums']["incident_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: unknown,"category_id": string,"corroboration_count"?: number,"description": string,"id"?: string,"location": unknown,"location_accuracy_m"?: number | null,"place_name"?: string | null,"reported_at"?: string,"reporter_id": string,"severity": Database["public"]['Enums']["severity"],"status"?: Database["public"]['Enums']["incident_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "area"?: unknown,"category_id"?: string,"corroboration_count"?: number,"description"?: string,"id"?: string,"location"?: unknown,"location_accuracy_m"?: number | null,"place_name"?: string | null,"reported_at"?: string,"reporter_id"?: string,"severity"?: Database["public"]['Enums']["severity"],"status"?: Database["public"]['Enums']["incident_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidents_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"phone": string | null,"role": Database["public"]['Enums']["app_role"],"show_name": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"show_name"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"show_name"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"rate_limit_events": {
                  Row: {
                    "action": string,"created_at": string,"id": number,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: never,"subject": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: never,"subject"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sos_requests": {
                  Row: {
                    "assigned_to": string | null,"contact_phone": string,"created_at": string,"device_id": string,"id": string,"landmark": string | null,"location": unknown,"location_accuracy_m": number | null,"notes": string | null,"people_count": number,"sender_id": string | null,"sender_kind": string,"state": Database["public"]['Enums']["sos_state"],"state_updated_at": string,"tracking_token_hash": string,"type": Database["public"]['Enums']["sos_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"contact_phone": string,"created_at"?: string,"device_id": string,"id"?: string,"landmark"?: string | null,"location"?: unknown,"location_accuracy_m"?: number | null,"notes"?: string | null,"people_count": number,"sender_id"?: string | null,"sender_kind": string,"state"?: Database["public"]['Enums']["sos_state"],"state_updated_at"?: string,"tracking_token_hash": string,"type": Database["public"]['Enums']["sos_type"]
                  }
                  Update: {
                    "assigned_to"?: string | null,"contact_phone"?: string,"created_at"?: string,"device_id"?: string,"id"?: string,"landmark"?: string | null,"location"?: unknown,"location_accuracy_m"?: number | null,"notes"?: string | null,"people_count"?: number,"sender_id"?: string | null,"sender_kind"?: string,"state"?: Database["public"]['Enums']["sos_state"],"state_updated_at"?: string,"tracking_token_hash"?: string,"type"?: Database["public"]['Enums']["sos_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "sos_requests_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sos_requests_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "incidents_public": {
                  Row: {
                    "area_geojson": Json | null,"category_group": Database["public"]['Enums']["category_group"],"category_id": string,"category_label": string,"corroboration_count": number,"description": string,"id": string,"lat": number | null,"lng": number | null,"place_name": string | null,"reported_at": string,"reporter_name": string | null,"severity": Database["public"]['Enums']["severity"],"status": Database["public"]['Enums']["incident_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "incidents_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"sos_responder_view": {
                  Row: {
                    "assigned_name": string | null,"assigned_to": string | null,"contact_phone": string,"created_at": string,"id": string,"landmark": string | null,"lat": number | null,"lng": number | null,"location_accuracy_m": number | null,"notes": string | null,"people_count": number,"sender_kind": string,"sender_name": string | null,"state": Database["public"]['Enums']["sos_state"],"state_updated_at": string,"type": Database["public"]['Enums']["sos_type"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "sos_requests_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"facilities_in_bbox":
{ Args: { "max_lat": number,"max_lng": number,"min_lat": number,"min_lng": number,"types"?: (Database["public"]['Enums']["facility_type"])[] }; Returns: {
              "address": string,"capacity": number,"contact_phone": string,"id": string,"is_stale": boolean,"lat": number,"lng": number,"name": string,"status": Database["public"]['Enums']["facility_status"],"status_updated_at": string,"type": Database["public"]['Enums']["facility_type"]
            }[]
                           },
"in_service_area":
{ Args: { "p": unknown }; Returns: boolean
                           },
"incident_summary":
{ Args: { "max_lat": number,"max_lng": number,"min_lat": number,"min_lng": number,"since"?: string }; Returns: Json
                           },
"incidents_in_bbox":
{ Args: { "category_ids"?: (string)[],"max_lat": number,"max_lng": number,"min_lat": number,"min_lng": number,"since"?: string,"statuses"?: (Database["public"]['Enums']["incident_status"])[] }; Returns: {
              "area_geojson": Json | null,
"category_group": Database["public"]['Enums']["category_group"],
"category_id": string,
"category_label": string,
"corroboration_count": number,
"description": string,
"id": string,
"lat": number | null,
"lng": number | null,
"place_name": string | null,
"reported_at": string,
"reporter_name": string | null,
"severity": Database["public"]['Enums']["severity"],
"status": Database["public"]['Enums']["incident_status"],
"title": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "incidents_public"
        isOneToOne: false
        isSetofReturn: true
      } },
"rate_limit_hit":
{ Args: { "p_action": string,"p_limit": number,"p_subject": string }; Returns: number
                           },
"require_role":
{ Args: { "allowed": (Database["public"]['Enums']["app_role"])[] }; Returns: undefined
                           },
"set_sos_state":
{ Args: { "new_state": Database["public"]['Enums']["sos_state"],"sos_id": string }; Returns: {
              "assigned_name": string | null,
"assigned_to": string | null,
"contact_phone": string,
"created_at": string,
"id": string,
"landmark": string | null,
"lat": number | null,
"lng": number | null,
"location_accuracy_m": number | null,
"notes": string | null,
"people_count": number,
"sender_kind": string,
"sender_name": string | null,
"state": Database["public"]['Enums']["sos_state"],
"state_updated_at": string,
"type": Database["public"]['Enums']["sos_type"]
            }
                          SetofOptions: {
        from: "*"
        to: "sos_responder_view"
        isOneToOne: true
        isSetofReturn: false
      } },
"sos_in_bbox":
{ Args: { "max_lat": number,"max_lng": number,"min_lat": number,"min_lng": number,"states"?: (Database["public"]['Enums']["sos_state"])[] }; Returns: {
              "assigned_name": string | null,
"assigned_to": string | null,
"contact_phone": string,
"created_at": string,
"id": string,
"landmark": string | null,
"lat": number | null,
"lng": number | null,
"location_accuracy_m": number | null,
"notes": string | null,
"people_count": number,
"sender_kind": string,
"sender_name": string | null,
"state": Database["public"]['Enums']["sos_state"],
"state_updated_at": string,
"type": Database["public"]['Enums']["sos_type"]
            }[]
                          SetofOptions: {
        from: "*"
        to: "sos_responder_view"
        isOneToOne: false
        isSetofReturn: true
      } },
"sos_list":
{ Args: { "page"?: number,"page_size"?: number,"states"?: (Database["public"]['Enums']["sos_state"])[] }; Returns: {
              "assigned_name": string | null,
"assigned_to": string | null,
"contact_phone": string,
"created_at": string,
"id": string,
"landmark": string | null,
"lat": number | null,
"lng": number | null,
"location_accuracy_m": number | null,
"notes": string | null,
"people_count": number,
"sender_kind": string,
"sender_name": string | null,
"state": Database["public"]['Enums']["sos_state"],
"state_updated_at": string,
"type": Database["public"]['Enums']["sos_type"]
            }[]
                          SetofOptions: {
        from: "*"
        to: "sos_responder_view"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            "app_role": "citizen"|"moderator"|"responder"|"admin","category_group": "natural"|"human_induced"|"facility"|"community","facility_status": "open"|"full"|"closed"|"unknown","facility_type": "evacuation_center"|"hospital"|"police_station"|"fire_station"|"rescue_station"|"relief_center","incident_status": "pending"|"verified"|"resolved"|"rejected","severity": "critical"|"high"|"moderate"|"low","sos_state": "new"|"acknowledged"|"responding"|"closed","sos_type": "medical"|"trapped_flood"|"fire"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["citizen", "moderator", "responder", "admin"],"category_group": ["natural", "human_induced", "facility", "community"],"facility_status": ["open", "full", "closed", "unknown"],"facility_type": ["evacuation_center", "hospital", "police_station", "fire_station", "rescue_station", "relief_center"],"incident_status": ["pending", "verified", "resolved", "rejected"],"severity": ["critical", "high", "moderate", "low"],"sos_state": ["new", "acknowledged", "responding", "closed"],"sos_type": ["medical", "trapped_flood", "fire", "other"]
          }
        }
} as const
