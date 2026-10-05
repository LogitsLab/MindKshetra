/**
 * One `<script type="application/ld+json">` per page, holding an `@graph`.
 *
 * JSON.stringify does not escape "<", so a literal "</script>" anywhere in the
 * data would close the tag early. The content layer is ours, but the escape
 * costs nothing and the failure mode is XSS.
 */
export default function JsonLd({ graph }: { graph: object[] }) {
  const data = { "@context": "https://schema.org", "@graph": graph };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
