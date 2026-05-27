import type { LifePulseCategoryId } from "./types";
import { defaultTableColumns } from "./qualifyingQuestions";
import { effectivePlanDays, resolvePlanIntent } from "./planIntent";
import { buildCategoryPlanRows } from "./structuredPlans";
import type { PlanTableRow } from "./structuredPlans";
import { rowsHaveContent } from "./linosTableNormalize";
import { getTableColumns, getTableRows } from "./tableRows";

/** Rebuild table rows when DB has empty cells but Linos metadata exists (schema mismatch fix). */
export function repairBlankPlanTable(
  category: LifePulseCategoryId,
  context: Record<string, unknown>,
  dueDate: string | null,
): { table_columns: string[]; table_rows: PlanTableRow[] } | null {
  const rows = getTableRows(context);
  if (rowsHaveContent(rows)) return null;

  const sourcePrompt =
    typeof context.source_prompt === "string" ? context.source_prompt : "";
  if (!sourcePrompt && !context.linos_generated) return null;

  const qualifyingAnswers =
    context.qualifying_answers && typeof context.qualifying_answers === "object"
      ? (context.qualifying_answers as Record<string, string>)
      : undefined;

  const intent = resolvePlanIntent(
    sourcePrompt || "plan",
    category,
    dueDate,
    qualifyingAnswers,
  );

  const built = buildCategoryPlanRows(
    category,
    intent,
    sourcePrompt,
    qualifyingAnswers,
  );

  if (!rowsHaveContent(built.table_rows)) return null;

  const columns = getTableColumns(category, context);
  return {
    table_columns: columns.length ? columns : built.table_columns,
    table_rows: built.table_rows.slice(0, effectivePlanDays(intent, category)),
  };
}
