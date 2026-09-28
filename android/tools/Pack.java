import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;
import java.util.Enumeration;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * aapt2 chiqargan APK'ga classes.dex qo'shadi, apksig bilan (v2) imzolaydi va tekshiradi.
 * Siqilmagan yozuvlar (resources.arsc, PNG, shriftlar) 4 baytga tekislanadi — zipalign o'rnini bosadi.
 * Android 11+ (targetSdk 30+) resources.arsc tekislanmagan bo'lsa ilovani o'rnatmaydi.
 * apksig yozuvlar joyini o'zgartirmaydi, shuning uchun tekislash imzodan keyin ham saqlanadi.
 *
 * Ishlatish: java -cp apksig.jar:. Pack base.apk classes.dex keystore.p12 parol alias chiqish.apk
 */
public class Pack {
    private static final int ALIGN = 4;
    /* zipalign/apksig ishlatadigan "tekislash" qo'shimcha maydoni: id, uzunlik, karrali, to'ldiruvchi nollar */
    private static final int ALIGN_EXTRA_ID = 0xD935;
    private static final int LFH_SIZE = 30;

    public static void main(String[] a) throws Exception {
        File base = new File(a[0]), dex = new File(a[1]), ks = new File(a[2]), out = new File(a[5]);
        String pass = a[3], alias = a[4];
        File unsigned = new File(out.getPath() + ".unsigned");

        try (ZipFile zf = new ZipFile(base);
             Counting cnt = new Counting(new FileOutputStream(unsigned));
             ZipOutputStream zo = new ZipOutputStream(cnt)) {
            Enumeration<? extends ZipEntry> en = zf.entries();
            while (en.hasMoreElements()) {
                ZipEntry e = en.nextElement();
                if (e.getName().equals("classes.dex")) continue;
                put(zo, cnt, e.getName(), readAll(zf.getInputStream(e)), e.getMethod() == ZipEntry.STORED);
            }
            put(zo, cnt, "classes.dex", readAll(new FileInputStream(dex)), false);
        }

        KeyStore k = KeyStore.getInstance("PKCS12");
        try (InputStream in = new FileInputStream(ks)) {
            k.load(in, pass.toCharArray());
        }
        PrivateKey pk = (PrivateKey) k.getKey(alias, pass.toCharArray());
        X509Certificate cert = (X509Certificate) k.getCertificate(alias);
        ApkSigner.SignerConfig sc = new ApkSigner.SignerConfig.Builder("KASSA", pk, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(sc))
                .setInputApk(unsigned)
                .setOutputApk(out)
                .setMinSdkVersion(24)
                .setV1SigningEnabled(false) // minSdk 24: Android 7.0+ v2 imzoni tekshiradi
                .setV2SigningEnabled(true)
                .setCreatedBy("Kassa Nazorati build")
                .build()
                .sign();
        if (!unsigned.delete()) unsigned.deleteOnExit();

        ApkVerifier.Result r = new ApkVerifier.Builder(out).build().verify();
        System.out.println("imzo tekshiruvi: " + (r.isVerified() ? "OK" : "XATO")
                + " (v1=" + r.isVerifiedUsingV1Scheme() + ", v2=" + r.isVerifiedUsingV2Scheme() + ")");
        for (Object i : r.getErrors()) System.out.println("  xato: " + i);
        for (Object i : r.getWarnings()) System.out.println("  ogohlantirish: " + i);
        if (!r.isVerified()) System.exit(2);
    }

    private static void put(ZipOutputStream zo, Counting cnt, String name, byte[] data, boolean stored) throws IOException {
        ZipEntry n = new ZipEntry(name);
        n.setTime(315532800000L + 86400000L); // qayta yig'ilganda bir xil natija uchun sobit vaqt
        if (stored) {
            n.setMethod(ZipEntry.STORED);
            n.setSize(data.length);
            n.setCompressedSize(data.length);
            CRC32 c = new CRC32();
            c.update(data);
            n.setCrc(c.getValue());
            /* ma'lumot boshlanadigan joy: sarlavha + nom + qo'shimcha maydon (kamida 6 bayt) */
            long start = cnt.n + LFH_SIZE + name.getBytes(StandardCharsets.UTF_8).length + 6;
            int pad = (int) ((ALIGN - start % ALIGN) % ALIGN);
            byte[] x = new byte[6 + pad];
            x[0] = (byte) ALIGN_EXTRA_ID;
            x[1] = (byte) (ALIGN_EXTRA_ID >>> 8);
            x[2] = (byte) (2 + pad);
            x[4] = (byte) ALIGN;
            n.setExtra(x);
        } else {
            n.setMethod(ZipEntry.DEFLATED);
        }
        zo.putNextEntry(n);
        if (stored && cnt.n % ALIGN != 0) {
            throw new IllegalStateException(name + " tekislanmadi (siljish " + cnt.n + ")");
        }
        zo.write(data);
        zo.closeEntry();
    }

    /** Yozilgan baytlarni sanaydi: keyingi yozuv qaysi siljishdan boshlanishini bilish uchun. */
    private static final class Counting extends FilterOutputStream {
        long n;

        Counting(OutputStream o) {
            super(o);
        }

        @Override
        public void write(int b) throws IOException {
            out.write(b);
            n++;
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            out.write(b, off, len);
            n += len;
        }
    }

    private static byte[] readAll(InputStream in) throws IOException {
        try {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
            return bo.toByteArray();
        } finally {
            in.close();
        }
    }
}
