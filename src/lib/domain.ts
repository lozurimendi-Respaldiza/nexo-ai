export type OpportunityStage =
  | "new"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  valueEur: number;
  stage: OpportunityStage;
  nextAction: string;
  dueLabel: string;
}

// Demo data only. Replace with authenticated Supabase queries before production.
export const demoOpportunities: Opportunity[] = [
  {
    id: "opp-001",
    title: "Renovación de servicios",
    company: "Empresa Ejemplo",
    valueEur: 2400,
    stage: "qualified",
    nextAction: "Confirmar necesidades y decisor",
    dueLabel: "Hoy"
  },
  {
    id: "opp-002",
    title: "Nueva cartera de clientes",
    company: "Comercial Norte",
    valueEur: 5100,
    stage: "proposal",
    nextAction: "Revisar propuesta enviada",
    dueLabel: "Mañana"
  },
  {
    id: "opp-003",
    title: "Servicio para nueva sede",
    company: "Grupo Demo",
    valueEur: 1250,
    stage: "negotiation",
    nextAction: "Solicitar decisión",
    dueLabel: "En 3 días"
  }
];

export const stageLabels: Record<OpportunityStage, string> = {
  new: "Nueva",
  qualified: "Cualificada",
  proposal: "Propuesta",
  negotiation: "Negociación",
  won: "Ganada",
  lost: "Perdida"
};
