import axios from 'axios';
import { logger } from '../lib/logger';

interface GeoInfo {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
}

export class GeoIP {
  private static cache = new Map<string, GeoInfo>();

  static async lookup(ip: string): Promise<GeoInfo | null> {
    // Skip local IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }

    // Check cache
    if (this.cache.has(ip)) {
      return this.cache.get(ip)!;
    }

    try {
      // Using ip-api.com (free tier)
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 2000
      });

      if (response.data.status === 'success') {
        const geoInfo: GeoInfo = {
          country: response.data.country,
          countryCode: response.data.countryCode,
          region: response.data.regionName,
          city: response.data.city,
          latitude: response.data.lat,
          longitude: response.data.lon,
          timezone: response.data.timezone,
          isp: response.data.isp
        };

        // Cache for 24 hours
        this.cache.set(ip, geoInfo);
        setTimeout(() => this.cache.delete(ip), 24 * 60 * 60 * 1000);

        return geoInfo;
      }
    } catch (error) {
      logger.error('GeoIP lookup failed:', { error, ip });
    }

    return null;
  }

  static async getCountry(ip: string): Promise<string | null> {
    const info = await this.lookup(ip);
    return info?.country || null;
  }

  static async getCity(ip: string): Promise<string | null> {
    const info = await this.lookup(ip);
    return info?.city || null;
  }

  static async getTimezone(ip: string): Promise<string | null> {
    const info = await this.lookup(ip);
    return info?.timezone || null;
  }
}