# IntelliApply `.is-a.dev` Domain Registration Plan

## 1. Prerequisites (Vercel Configuration)
Since IntelliApply is currently hosted on Vercel (`https://intelli-apply.vercel.app/`), we need to configure the domain on Vercel to get the required verification TXT record.

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and select the **IntelliApply** project.
2. Navigate to **Settings** > **Domains**.
3. Click **Add Domain** and enter: `intelliapply.is-a.dev`
4. *Important:* If Vercel prompts you to redirect `intelliapply.is-a.dev` to `www.intelliapply.is-a.dev` (or vice versa), it is highly recommended to **disable** it (unless you want to configure two separate domains).
5. Vercel will show that the domain is unverified. Click **Continue manually** (if prompted) and copy the **TXT verification value** that Vercel provides.

## 2. Prepare the Domain Files
You need to fork the `is-a-dev/register` repository and create two JSON files in the `domains/` folder.

### File 1: `domains/intelliapply.json`
This file connects the domain to Vercel via the `A` record recommended by Vercel.

```json
{
    "owner": {
        "username": "shivenpatro",
        "email": "shivenpatro2018@gmail.com"
    },
    "records": {
        "CNAME": "cname.vercel-dns.com."
    }
}
```
*(Note: You can also use the A record `["76.76.21.21"]` depending on what Vercel recommends in your dashboard, but `CNAME` pointing to `cname.vercel-dns.com.` is typically best for Vercel, or `A` pointing to `216.198.79.1` as mentioned in the is-a.dev docs. Follow whatever Vercel displays on the Domains page).*

### File 2: `domains/_vercel.intelliapply.json`
This file is required by Vercel to verify your ownership of the domain. Replace `YOUR_VERCEL_TXT_STRING` with the string you copied in Step 1.

```json
{
    "owner": {
        "username": "shivenpatro",
        "email": "shivenpatro2018@gmail.com"
    },
    "records": {
        "TXT": "YOUR_VERCEL_TXT_STRING"
    }
}
```

## 3. Submit the Pull Request
1. Commit the two files to your fork of `is-a-dev/register`.
2. Open a Pull Request from your fork to the main `is-a-dev/register` repository.
3. Fill out the **Pull Request Template** exactly as shown below:

```markdown
# Requirements
- [x] I **agree** to the [Terms of Service](https://is-a.dev/terms).
- [x] My file is following the [domain structure](https://docs.is-a.dev/domain-structure/).
- [x] My website is **reachable** and **completed**.
- [x] My website is **software development** related.
- [x] My website is **not for commercial use**.
- [x] I have provided contact information in the `owner` key.
- [x] I have provided a preview of my website below.

# Website Preview
**Link:** https://intelli-apply.vercel.app/

**Screenshot:**
<!-- ⚠️ IMPORTANT: You must drag and drop a screenshot of the IntelliApply dashboard here ⚠️ -->
![IntelliApply Screenshot](https://github.com/user-attachments/assets/1760cac9-353c-460f-8ce9-ccc8d263eafd)

# Website Purpose
IntelliApply is a full-stack open-source web application designed to automate and personalize the job search process using AI to match user resumes with job postings. It is a non-commercial software development project intended to help developers find relevant job opportunities efficiently.
```

## 4. Post-Submission
- Keep an eye on your GitHub notifications. Maintainers might ask for adjustments.
- If your PR is merged, your domain `intelliapply.is-a.dev` will be live in a few minutes!
- Go back to your Vercel Dashboard; the domain should now show as **Valid**. If it redirects back to the Vercel default URL, try clearing your browser cache.
