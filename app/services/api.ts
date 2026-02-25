const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
console.log("API Service Initialized with URL:", API_BASE_URL);

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  currency?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string | null;
  fuelType: "petrol" | "diesel" | "lpg" | "electric" | "hybrid";
  brand: string | null;
  model: string | null;
  year: number | null;
  engine: string | null;
  enginePower: string | null;
}

export interface FuelEntry {
  id: string;
  vehicleId: string | null;
  vehicleName: string | null;
  stationName: string | null;
  stationAddress: string | null;
  stationLat: number | null;
  stationLng: number | null;
  date: string;
  time: string | null;
  pricePerLiter: number | null;
  totalLiters: number | null;
  totalCost: number;
  mileage: number | null;
  receiptImageUrl: string | null;
  notes: string | null;
}

export interface GasStation {
  id: number;
  lat: number;
  lng: number;
  name: string;
  brand: string | null;
  address: string | null;
  distance: number;
  fuelTypes: string[];
  openingHours: string | null;
}

export interface Stats {
  period: string;
  summary: {
    total_spent: number;
    avg_per_tank: number;
    total_tanks: number;
    avg_price_per_liter: number;
    avg_liters_per_tank: number;
    total_liters: number;
  };
  chart: {
    labels: string[];
    data: number[];
  };
  insights?: {
    favoriteStation?: { name: string; count: number };
    mostExpensive?: { date: string; cost: number };
    cheapestLiters?: { date: string; price: number };
    mostExpensiveLiter?: { date: string; price: number };
    biggestFillUp?: { date: string; liters: number };
    smallestFillUp?: { date: string; liters: number };
    favoriteDay?: { day: string; count: number };
    lastFillUpDays?: number;
  };
  monthly: Array<{ month: string; total: number; count: number }>;
  weekly: Array<{ week: number; total: number; count: number }>;
}

export interface ReceiptScanResult {
  imageUrl: string | null;
  rawText: string;
  parsed: {
    stationName: string | null;
    date: string | null;
    time: string | null;
    pricePerLiter: number | null;
    totalLiters: number | null;
    totalCost: number | null;
  };
}

class ApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Bypass-Tunnel-Reminder": "true",
      "ngrok-skip-browser-warning": "true",
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`API Error [${response.status}]:`, text.substring(0, 500)); // Log first 500 chars

      try {
        const json = JSON.parse(text);
        throw new Error(json.error || `HTTP ${response.status}`);
      } catch (e) {
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
      }
    }

    return response.json();
  }

  // Auth
  async signInWithGoogle(
    idToken: string,
    platform: string,
    deviceId: string,
    deviceName?: string,
  ) {
    return this.request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken, platform, deviceId, deviceName }),
    });
  }

  async signInAsGuest(deviceId: string, deviceName?: string) {
    return this.request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/guest", {
      method: "POST",
      body: JSON.stringify({ deviceId, deviceName }),
    });
  }

  // Web OAuth - uses access token and user info from Google
  async signInWithGoogleWeb(
    googleAccessToken: string,
    googleUser: { id: string; email: string; name: string; picture: string },
    platform: string,
    deviceId: string,
    deviceName?: string,
  ) {
    return this.request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/google/web", {
      method: "POST",
      body: JSON.stringify({
        googleAccessToken,
        googleUser,
        platform,
        deviceId,
        deviceName,
      }),
    });
  }

  async refreshToken(refreshToken: string, deviceId: string) {
    return this.request<{ accessToken: string }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken, deviceId }),
    });
  }

  async logout(deviceId: string) {
    return this.request<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ deviceId }),
    });
  }

  // Users
  async getMe() {
    return this.request<User>("/api/users/me");
  }

  async updateMe(data: { name: string }) {
    return this.request<User>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Vehicles
  async getVehicles() {
    return this.request<Vehicle[]>("/api/vehicles");
  }

  async addVehicle(data: Omit<Vehicle, "id">) {
    return this.request<Vehicle>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: string, data: Partial<Vehicle>) {
    return this.request<Vehicle>(`/api/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: string) {
    return this.request<{ success: boolean }>(`/api/vehicles/${id}`, {
      method: "DELETE",
    });
  }

  // Fuel Entries
  async getEntries(params?: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sortBy?: "date" | "price" | "liters";
    order?: "ASC" | "DESC";
  }) {
    const searchParams = new URLSearchParams();
    if (params?.vehicleId) searchParams.set("vehicleId", params.vehicleId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.order) searchParams.set("order", params.order);

    const query = searchParams.toString();
    return this.request<FuelEntry[]>(`/api/entries${query ? `?${query}` : ""}`);
  }

  async getStats(
    period: "week" | "month" | "year" | "all" = "month",
    date?: string,
  ) {
    return this.request<Stats>(
      `/api/entries/stats?period=${period}${date ? `&date=${date}` : ""}`,
    );
  }

  async addEntry(data: Omit<FuelEntry, "id" | "vehicleName">, force = false) {
    return this.request<FuelEntry>(
      `/api/entries${force ? "?force=true" : ""}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async updateEntry(id: string, data: Partial<FuelEntry>) {
    return this.request<FuelEntry>(`/api/entries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteEntry(id: string) {
    return this.request<{ success: boolean }>(`/api/entries/${id}`, {
      method: "DELETE",
    });
  }

  // Receipts
  async scanReceipt(imageBase64: string, mimeType: string) {
    const formData = new FormData();
    formData.append("image", {
      uri: `data:${mimeType};base64,${imageBase64}`,
      type: mimeType,
      name: "receipt.jpg",
    } as any);

    const response = await fetch(`${API_BASE_URL}/api/receipts/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`Scan Error [${response.status}]:`, text.substring(0, 500));
      throw new Error(`Failed to scan: HTTP ${response.status}`);
    }

    return response.json() as Promise<ReceiptScanResult>;
  }

  // Gas Stations
  async getNearbyStations(lat: number, lng: number, radius = 5000) {
    return this.request<{ count: number; stations: GasStation[] }>(
      `/api/stations/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
    );
  }

  async searchStations(params: {
    query?: string;
    lat?: number;
    lng?: number;
    bounds?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (params.lat) searchParams.set("lat", params.lat.toString());
    if (params.lng) searchParams.set("lng", params.lng.toString());
    if (params.bounds) searchParams.set("bounds", params.bounds);

    return this.request<{ count: number; stations: GasStation[] }>(
      `/api/stations/search?${searchParams.toString()}`,
    );
  }

  async autocompleteStations(query: string, lat?: number, lng?: number) {
    let url = `/api/stations/autocomplete?query=${encodeURIComponent(query)}`;
    if (lat && lng) {
      url += `&lat=${lat}&lng=${lng}`;
    }
    return this.request<{
      suggestions: {
        id: string;
        name: string;
        address: string | null;
        lat?: number;
        lng?: number;
        distance?: number;
      }[];
    }>(url);
  }
}

export const api = new ApiService();
export default api;
