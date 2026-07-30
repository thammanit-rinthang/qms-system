import { describe, expect, it } from "vitest";
import { richTextToEmailHtml, richTextToPlainText } from "@/services/carEmailService";

describe("CAR email rich text helpers", () => {
  it("renders allowed WYSIWYG HTML and removes unsafe blocks", () => {
    const html = richTextToEmailHtml("<p>Issue <strong>A</strong></p><script>alert(1)</script><img src=x>");

    expect(html).toContain("<p>Issue <strong>A</strong></p>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert(1)");
    expect(html).toContain("&lt;img src=x&gt;");
  });

  it("converts WYSIWYG HTML to plain notification text", () => {
    const text = richTextToPlainText("<p>Issue</p><ul><li>First</li><li>Second</li></ul>");

    expect(text).toContain("Issue");
    expect(text).toContain("- First");
    expect(text).toContain("- Second");
    expect(text).not.toContain("<li>");
  });
});
