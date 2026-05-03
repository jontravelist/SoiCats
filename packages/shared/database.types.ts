// Hand-written Database type so the mobile app type-checks before the
// real one is generated. Run `npx supabase gen types typescript --local`
// to regenerate this file from the live schema and overwrite it.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Geography = unknown;
type Vector = unknown;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          handle: string | null;
          display_name: string | null;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
          points: number;
          locale: string;
          home_location: Geography | null;
          created_at: string;
          last_active_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
      cats: {
        Row: {
          id: string;
          name: string;
          name_th: string | null;
          discovered_by_user_id: string | null;
          discovered_at: string;
          primary_color: string;
          pattern: string;
          distinguishing_features: string | null;
          age_guess: Database["public"]["Enums"]["cat_age_guess"] | null;
          sex: Database["public"]["Enums"]["cat_sex"];
          territory_centroid: Geography;
          last_seen_at: string;
          status: Database["public"]["Enums"]["cat_status"];
          tnr_status: Database["public"]["Enums"]["tnr_status"];
          tnr_confirmed_at: string | null;
          tnr_confirmed_by_clinic: string | null;
          vaccination_status: Database["public"]["Enums"]["vaccination_status"];
          last_vaccination_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cats"]["Row"], "id" | "created_at" | "discovered_at" | "last_seen_at"> & {
          id?: string;
          created_at?: string;
          discovered_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cats"]["Row"]>;
        Relationships: [];
      };
      sightings: {
        Row: {
          id: string;
          cat_id: string | null;
          photographer_id: string;
          photo_url: string;
          photo_hash: string | null;
          photo_embedding: Vector | null;
          model_version: string | null;
          location: Geography;
          location_accuracy_m: number | null;
          caption: string | null;
          points_awarded: number;
          status: Database["public"]["Enums"]["sighting_status"];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sightings"]["Row"], "id" | "created_at" | "points_awarded"> & {
          id?: string;
          created_at?: string;
          points_awarded?: number;
        };
        Update: Partial<Database["public"]["Tables"]["sightings"]["Row"]>;
        Relationships: [];
      };
      comments: {
        Row: { id: string; sighting_id: string; user_id: string; body: string; created_at: string };
        Insert: { id?: string; sighting_id: string; user_id: string; body: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
        Relationships: [];
      };
      likes: {
        Row: { sighting_id: string; user_id: string; created_at: string };
        Insert: { sighting_id: string; user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["likes"]["Row"]>;
        Relationships: [];
      };
      user_favourite_cats: {
        Row: { user_id: string; cat_id: string; created_at: string };
        Insert: { user_id: string; cat_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_favourite_cats"]["Row"]>;
        Relationships: [];
      };
      cat_health_flags: {
        Row: {
          id: string;
          cat_id: string;
          flagged_by: string;
          flag_type: Database["public"]["Enums"]["flag_type"];
          description: string | null;
          photo_url: string | null;
          status: Database["public"]["Enums"]["flag_status"];
          verified_at: string | null;
          verified_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cat_health_flags"]["Row"], "id" | "created_at" | "status" | "verified_at" | "verified_by" | "resolved_at"> & {
          id?: string;
          created_at?: string;
          status?: Database["public"]["Enums"]["flag_status"];
        };
        Update: Partial<Database["public"]["Tables"]["cat_health_flags"]["Row"]>;
        Relationships: [];
      };
      feed_logs: {
        Row: { id: string; cat_id: string; feeder_id: string; fed_at: string; location: Geography | null; notes: string | null; photo_url: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["feed_logs"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["feed_logs"]["Row"]>;
        Relationships: [];
      };
      sticker_packs: {
        Row: { id: string; name: string; artist_name: string; artist_credit_url: string | null; unlock_threshold: number; release_at: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["sticker_packs"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["sticker_packs"]["Row"]>;
        Relationships: [];
      };
      stickers: {
        Row: { id: string; pack_id: string; name: string; image_url: string; sort_order: number };
        Insert: Omit<Database["public"]["Tables"]["stickers"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["stickers"]["Row"]>;
        Relationships: [];
      };
      user_stickers: {
        Row: { user_id: string; sticker_id: string; unlocked_at: string };
        Insert: { user_id: string; sticker_id: string; unlocked_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_stickers"]["Row"]>;
        Relationships: [];
      };
      points_log: {
        Row: { id: string; user_id: string; action_type: string; points: number; related_entity_id: string | null; related_entity_type: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["points_log"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["points_log"]["Row"]>;
        Relationships: [];
      };
      identification_votes: {
        Row: { sighting_id: string; voter_id: string; proposed_cat_id: string | null; proposed_new: boolean; created_at: string };
        Insert: { sighting_id: string; voter_id: string; proposed_cat_id?: string | null; proposed_new?: boolean; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["identification_votes"]["Row"]>;
        Relationships: [];
      };
      device_tokens: {
        Row: { id: string; user_id: string; token: string; platform: "ios" | "android"; created_at: string; last_seen_at: string };
        Insert: Omit<Database["public"]["Tables"]["device_tokens"]["Row"], "id" | "created_at" | "last_seen_at"> & { id?: string; created_at?: string; last_seen_at?: string };
        Update: Partial<Database["public"]["Tables"]["device_tokens"]["Row"]>;
        Relationships: [];
      };
      notification_settings: {
        Row: { user_id: string; favourite_cat_photo: boolean; injured_or_missing: boolean; sticker_unlocked: boolean; comment_on_my_photo: boolean; identify_resolved: boolean };
        Insert: Database["public"]["Tables"]["notification_settings"]["Row"];
        Update: Partial<Database["public"]["Tables"]["notification_settings"]["Row"]>;
        Relationships: [];
      };
      clinics: {
        Row: { id: string; name: string; address: string | null; location: Geography | null; contact_phone: string | null; contact_email: string | null; verified_at: string | null; verified_by: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["clinics"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["clinics"]["Row"]>;
        Relationships: [];
      };
      clinic_updates: {
        Row: { id: string; cat_id: string; clinic_id: string; update_type: Database["public"]["Enums"]["clinic_update_type"]; notes: string | null; performed_at: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["clinic_updates"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["clinic_updates"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      nearby_cats: {
        Args: { lat: number; lng: number; radius_m?: number; max_rows?: number };
        Returns: {
          id: string;
          name: string;
          name_th: string | null;
          primary_color: string;
          pattern: string;
          status: Database["public"]["Enums"]["cat_status"];
          distance_m: number;
          last_seen_at: string;
          thumbnail_url: string | null;
          photo_count: number;
        }[];
      };
      nearby_feed: {
        Args: { lat: number; lng: number; radius_m?: number; max_rows?: number; before?: string | null };
        Returns: {
          sighting_id: string;
          cat_id: string | null;
          cat_name: string | null;
          photographer_id: string;
          photographer_handle: string | null;
          photo_url: string;
          caption: string | null;
          distance_m: number;
          created_at: string;
          like_count: number;
          comment_count: number;
        }[];
      };
      following_feed: {
        Args: { max_rows?: number; before?: string | null };
        Returns: {
          sighting_id: string;
          cat_id: string | null;
          cat_name: string | null;
          photographer_id: string;
          photographer_handle: string | null;
          photo_url: string;
          caption: string | null;
          created_at: string;
          like_count: number;
          comment_count: number;
        }[];
      };
      duplicate_candidates: {
        Args: { lat: number; lng: number; primary_color: string; pattern: string };
        Returns: { id: string; name: string; distance_m: number; thumbnail_url: string | null }[];
      };
      points_today: {
        Args: { target_user: string };
        Returns: number;
      };
      recalculate_territory: {
        Args: { target_cat_id: string };
        Returns: void;
      };
      recent_close_sighting: {
        Args: { photographer: string; target_cat: string; exclude_id: string; radius_m: number; since: string };
        Returns: boolean;
      };
      pending_identifications: {
        Args: { lng?: number | null; lat?: number | null; radius_m?: number; max_rows?: number };
        Returns: {
          sighting_id: string;
          photo_url: string;
          caption: string | null;
          created_at: string;
          distance_m: number | null;
          photographer_handle: string | null;
          sighting_lng: number;
          sighting_lat: number;
        }[];
      };
      pending_identification_count: {
        Args: { lng?: number | null; lat?: number | null; radius_m?: number };
        Returns: number;
      };
      maybe_resolve_identification: {
        Args: { target_sighting: string };
        Returns: void;
      };
      cats_in_radius: {
        Args: { lat: number; lng: number; radius_m?: number; max_rows?: number };
        Returns: {
          id: string;
          name: string;
          primary_color: string;
          pattern: string;
          status: Database["public"]["Enums"]["cat_status"];
          distance_m: number;
          last_seen_at: string;
          thumbnail_url: string | null;
          centroid_lng: number;
          centroid_lat: number;
        }[];
      };
      cats_needing_help: {
        Args: { lng?: number | null; lat?: number | null; radius_m?: number; max_rows?: number };
        Returns: {
          cat_id: string;
          cat_name: string;
          flag_id: string;
          flag_type: Database["public"]["Enums"]["flag_type"];
          flagged_at: string;
          description: string | null;
          thumbnail_url: string | null;
          distance_m: number | null;
          centroid_lng: number;
          centroid_lat: number;
        }[];
      };
      latest_flag_for_cat: {
        Args: { target_cat: string };
        Returns: {
          id: string;
          flag_type: Database["public"]["Enums"]["flag_type"];
          status: Database["public"]["Enums"]["flag_status"];
          description: string | null;
          created_at: string;
        }[];
      };
    };
    Enums: {
      user_role: "user" | "feeder" | "clinic_admin" | "app_admin";
      cat_status: "active" | "injured" | "missing" | "deceased";
      cat_age_guess: "kitten" | "young" | "adult" | "senior";
      cat_sex: "male" | "female" | "unknown";
      tnr_status: "unknown" | "intact" | "ear_tipped" | "sterilised";
      vaccination_status: "unknown" | "partial" | "fully_vaccinated";
      sighting_status: "confirmed" | "pending_id" | "rejected";
      flag_type: "injured" | "missing" | "deceased";
      flag_status: "open" | "verified" | "resolved" | "dismissed";
      clinic_update_type: "vaccination" | "sterilisation" | "ear_tip" | "health_check" | "other";
    };
    CompositeTypes: Record<string, never>;
  };
}
