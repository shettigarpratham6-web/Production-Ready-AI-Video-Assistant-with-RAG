import os
import inngest

is_prod = os.getenv("INNGEST_PRODUCTION", "false").lower() in ("true", "1")

inngest_client = inngest.Inngest(
    app_id="advanced-rag-project",
    is_production=is_prod,
)