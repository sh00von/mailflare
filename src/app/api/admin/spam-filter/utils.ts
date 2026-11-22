import { z } from "zod";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getSpamIntelligenceStatus, MAX_SPAM_BRANDS, saveSpamIntelligenceSettings, spamBrandSchema } from "@/lib/spam/settings";

const schema = z.object({
	spamhausDqsKey: z.string().nullable().optional(),
	abuseChAuthKey: z.string().nullable().optional(),
	domainAge: z.boolean().optional(),
	brands: z.array(spamBrandSchema).max(MAX_SPAM_BRANDS).optional(),
});

const noStore = { "Cache-Control": "no-store" };

async function authorize(request: Request, mutation: boolean) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return { env, error: auth.error };
	if (!isPrimaryAdmin(auth.user)) return { env, error: Response.json({ error: "Forbidden" }, { status: 403 }) };
	if (mutation && !hasValidSessionMutationOrigin(request)) return { env, error: Response.json({ error: "Invalid origin" }, { status: 403 }) };
	return { env, error: null };
}

export async function GET(request: Request) {
	const access = await authorize(request, false);
	if (access.error) return access.error;
	return Response.json(await getSpamIntelligenceStatus(access.env), { headers: noStore });
}

export async function PUT(request: Request) {
	const access = await authorize(request, true);
	if (access.error) return access.error;
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return Response.json({ error: "Check the settings and brands you entered" }, { status: 400 });
	const input = parsed.data;
	if (!(await getSpamIntelligenceStatus(access.env)).available) {
		return Response.json({ error: "Apply the pending database update first" }, { status: 409 });
	}

	await saveSpamIntelligenceSettings(access.env, {
		spamhausDqsKey: input.spamhausDqsKey,
		abusechAuthKey: input.abuseChAuthKey,
		spamDomainAgeCheck: input.domainAge,
		spamBrands: input.brands,
	});
	return Response.json(await getSpamIntelligenceStatus(access.env), { headers: noStore });
}
