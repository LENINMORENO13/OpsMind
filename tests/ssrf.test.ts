import {
  inspectUrl,
  validatePublicHttpUrl,
  isBlockedIp,
} from "../src/utils/ssrf.util.js";

describe("Utilidad SSRF - validación de URLs de monitores", () => {
  describe("inspectUrl (validación síncrona)", () => {
    it("Debería aceptar URLs http y https con hostname público", () => {
      expect(inspectUrl("https://example.com/health").ok).toBe(true);
      expect(inspectUrl("http://api.example.com").ok).toBe(true);
    });

    it("Debería rechazar protocolos diferentes de http/https", () => {
      expect(inspectUrl("ftp://example.com").ok).toBe(false);
      expect(inspectUrl("file:///etc/passwd").ok).toBe(false);
      expect(inspectUrl("gopher://example.com").ok).toBe(false);
    });

    it("Debería rechazar hostnames reservados como localhost o *.internal", () => {
      expect(inspectUrl("http://localhost/admin").ok).toBe(false);
      expect(inspectUrl("http://servicio.local/health").ok).toBe(false);
      expect(inspectUrl("http://metadata.google.internal").ok).toBe(false);
      expect(inspectUrl("http://db.internal").ok).toBe(false);
    });

    it("Debería rechazar literales IPv4 internos", () => {
      const blocked = [
        "http://127.0.0.1",
        "http://10.1.2.3",
        "http://172.16.5.5",
        "http://192.168.1.10",
        "http://169.254.169.254/latest/meta-data",
        "http://0.0.0.0",
      ];
      for (const url of blocked) {
        expect(inspectUrl(url).ok).toBe(false);
      }
    });

    it("Debería rechazar literales IPv6 internos", () => {
      const blocked = [
        "http://[::1]",
        "http://[::]",
        "http://[fe80::1]",
        "http://[fc00::1]",
        "http://[::ffff:127.0.0.1]",
        "http://[::ffff:192.168.0.1]",
      ];
      for (const url of blocked) {
        expect(inspectUrl(url).ok).toBe(false);
      }
    });

    it("Debería aceptar literales IP públicos", () => {
      expect(inspectUrl("http://8.8.8.8").ok).toBe(true);
      expect(inspectUrl("http://[2606:4700:4700::1111]").ok).toBe(true);
    });
  });

  describe("validatePublicHttpUrl (resolución DNS)", () => {
    it("Debería permitir un hostname público que resuelve a una IP pública", async () => {
      const resolver = jest
        .fn()
        .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);

      const result = await validatePublicHttpUrl(
        "https://example.com",
        resolver,
      );

      expect(result.ok).toBe(true);
      expect(result.address).toBe("93.184.216.34");
      expect(resolver).toHaveBeenCalledWith("example.com");
    });

    it("Debería bloquear un hostname público que resuelve a una IP privada (rebinding)", async () => {
      const resolver = jest
        .fn()
        .mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);

      const result = await validatePublicHttpUrl(
        "https://example.com",
        resolver,
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toContain("non-public");
    });

    it("Debería bloquear si alguna de las IPs resueltas es interna", async () => {
      const resolver = jest.fn().mockResolvedValue([
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]);

      const result = await validatePublicHttpUrl(
        "https://example.com",
        resolver,
      );

      expect(result.ok).toBe(false);
    });

    it("Debería fallar de forma segura si el DNS no resuelve", async () => {
      const resolver = jest
        .fn()
        .mockRejectedValue(new Error("ENOTFOUND"));

      const result = await validatePublicHttpUrl(
        "https://no-existe.example.com",
        resolver,
      );

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("Could not resolve URL host");
    });

    it("No debería resolver DNS para un literal IP (usa la propia IP)", async () => {
      const resolver = jest.fn();

      const result = await validatePublicHttpUrl("http://8.8.8.8", resolver);

      expect(result.ok).toBe(true);
      expect(result.address).toBe("8.8.8.8");
      expect(resolver).not.toHaveBeenCalled();
    });
  });

  describe("isBlockedIp", () => {
    it("Debería clasificar correctamente IPv4 e IPv6", () => {
      expect(isBlockedIp("127.0.0.1", 4)).toBe(true);
      expect(isBlockedIp("8.8.8.8", 4)).toBe(false);
      expect(isBlockedIp("::1", 6)).toBe(true);
      expect(isBlockedIp("2606:4700:4700::1111", 6)).toBe(false);
    });
  });
});
