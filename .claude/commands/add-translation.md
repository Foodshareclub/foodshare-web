# Add Translation

Add translations for: $ARGUMENTS

## Workflow

1. **Identify Text**
   - Find hardcoded strings in the target component/page
   - Group related strings into namespaces

2. **Add to English**
   - Add keys to `messages/en.json`
   - Use descriptive, hierarchical keys

3. **Update Component**

   ```typescript
   // Server Component
   const t = await getTranslations("namespace");

   // Client Component
   const t = useTranslations("namespace");

   // Usage
   {
     t("key");
   }
   {
     t("key", { value: 123 });
   }
   ```

4. **Add Other Languages**
   - Copy to other locale files
   - Translate or mark for translation

## Namespace Convention

```json
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "products": { "title": "Products", "empty": "No products" },
  "errors": { "required": "{field} is required" }
}
```

## Interpolation

```json
{
  "greeting": "Hello, {name}!",
  "count": "{count, plural, =0 {None} one {# item} other {# items}}"
}
```
