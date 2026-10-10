import { cleanText, goldInrPer10g, mergeArticles, optimiseImage, parseRss, summarise, toQuote, type NewsArticle } from "../server/news-parse";

const MINT = `<rss><channel><item>
  <title><![CDATA[Sensex, Nifty snap 8-week losing streak &amp; what&#8217;s next]]></title>
  <link><![CDATA[https://www.livemint.com/market/a-111.html]]></link>
  <description><![CDATA[<p>Markets rose <b>2%</b> this week.</p>]]></description>
  <pubDate><![CDATA[Sat, 10 Oct 2026 18:25:46 +0530]]></pubDate>
  <media:content height="900" medium="image" url="https://www.livemint.com/img/a.jpg" width="1600"/>
</item><item>
  <title>No link item</title>
</item></channel></rss>`;

const ET = `<rss><channel><item><title><![CDATA[RBI holds repo rate]]> </title><description><![CDATA[Policy unchanged.]]> </description><link>https://economictimes.indiatimes.com/x/articleshow/134853108.cms</link><enclosure type="image/jpeg" url="https://img.etimg.com/photo/msid-134853108,imgsize-1933990.cms" length="0"/><pubDate>Sat, 10 Oct 2026 16:57:20 +0530</pubDate></item></channel></rss>`;

describe("news feed parsing", () => {
  it("parses CDATA, entities, images and dates; skips items without a link", () => {
    const [a, ...rest] = parseRss(MINT, "Mint", "markets");
    expect(rest).toHaveLength(0);
    expect(a.title).toBe("Sensex, Nifty snap 8-week losing streak & what’s next");
    expect(a.summary).toBe("Markets rose 2% this week.");
    expect(a.image).toBe("https://www.livemint.com/img/a.jpg");
    expect(a.publishedAt).toBe("2026-10-10T12:55:46.000Z");
    expect(a.source).toBe("Mint");
  });

  it("reads enclosure images and swaps ET originals for a 640px thumbnail", () => {
    const [a] = parseRss(ET, "Economic Times", "economy");
    expect(a.title).toBe("RBI holds repo rate");
    expect(a.image).toBe("https://img.etimg.com/thumb/msid-134853108,width-640,height-360,resizemode-4/photo.jpg");
    expect(optimiseImage("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
  });

  it("merges feeds newest first and drops duplicate links and headlines", () => {
    const mk = (id: string, title: string, link: string, at: string): NewsArticle =>
      ({ id, title, link, summary: "", image: null, source: "S", topic: "markets", publishedAt: at });
    const out = mergeArticles([
      [mk("1", "Old story", "https://a/1", "2026-10-08T00:00:00Z"), mk("2", "Gold hits record!", "https://a/2", "2026-10-10T00:00:00Z")],
      [mk("3", "Gold hits record", "https://b/9", "2026-10-09T00:00:00Z"), mk("4", "Old story", "https://a/1", "2026-10-08T00:00:00Z")],
    ]);
    expect(out.map((a) => a.id)).toEqual(["2", "1"]);
  });

  it("cleans markup and trims summaries on a word boundary", () => {
    expect(cleanText("<p>Hello&nbsp;<i>world</i></p>")).toBe("Hello world");
    const s = summarise("word ".repeat(80), 50);
    expect(s.length).toBeLessThanOrEqual(51);
    expect(s.endsWith("word…")).toBe(true);
  });
});

describe("ticker quotes", () => {
  const meta = { symbol: "^NSEI", label: "Nifty 50", short: "N50" };
  it("computes the last-session change from daily closes", () => {
    const q = toQuote(meta, "INR", [100, NaN, 110, 121])!;
    expect(q.price).toBe(121);
    expect(q.change).toBe(11);
    expect(q.changePct).toBe(10);
    expect(q.spark).toEqual([100, 110, 121]);
  });

  it("uses a live price for today's bar and still compares with the previous session", () => {
    // Yahoo's live price is often a hair off the float close of today's bar.
    const q = toQuote(meta, "INR", [100, 110, 121.0004], 121)!;
    expect(q.price).toBe(121);
    expect(q.change).toBe(11);
    expect(q.spark).toEqual([100, 110, 121]);
    expect(toQuote(meta, "INR", [100])).toBeNull();
  });

  it("converts gold $/oz × USD/INR into ₹ per 10 g", () => {
    const gold = toQuote({ symbol: "GC=F", label: "Gold", short: "Au" }, "USD", [3000, 3110.35])!;
    const fx = toQuote({ symbol: "INR=X", label: "USD/INR", short: "$₹" }, "INR", [100, 100])!;
    const g = goldInrPer10g(gold, fx)!;
    expect(g.price).toBe(100000); // 3110.35 × 100 × 10 / 31.1035
    expect(g.changePct).toBeCloseTo(3.68, 2);
    expect(g.spark).toHaveLength(2);
    expect(goldInrPer10g(gold, undefined)).toBeNull();
  });
});
