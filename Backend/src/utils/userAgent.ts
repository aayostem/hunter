export class UserAgent {
  private ua: string;

  constructor(userAgent: string) {
    this.ua = userAgent || '';
  }

  getBrowser(): string {
    if (this.ua.includes('Chrome')) return 'Chrome';
    if (this.ua.includes('Firefox')) return 'Firefox';
    if (this.ua.includes('Safari')) return 'Safari';
    if (this.ua.includes('Edge')) return 'Edge';
    if (this.ua.includes('MSIE') || this.ua.includes('Trident')) return 'Internet Explorer';
    return 'Unknown';
  }

  getOS(): string {
    if (this.ua.includes('Windows')) return 'Windows';
    if (this.ua.includes('Mac OS')) return 'macOS';
    if (this.ua.includes('Linux')) return 'Linux';
    if (this.ua.includes('Android')) return 'Android';
    if (this.ua.includes('iOS') || this.ua.includes('iPhone') || this.ua.includes('iPad')) {
      return 'iOS';
    }
    return 'Unknown';
  }

  getDevice(): string {
    if (this.ua.includes('Mobile')) return 'Mobile';
    if (this.ua.includes('Tablet') || this.ua.includes('iPad')) return 'Tablet';
    return 'Desktop';
  }

  isBot(): boolean {
    const bots = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'];
    return bots.some(bot => this.ua.toLowerCase().includes(bot));
  }

  getInfo() {
    return {
      browser: this.getBrowser(),
      os: this.getOS(),
      device: this.getDevice(),
      isBot: this.isBot(),
      raw: this.ua
    };
  }
}