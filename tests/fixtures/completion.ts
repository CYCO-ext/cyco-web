export const completionActors = {
  generator: {
    id: "e2e-generator-001",
    role: "GENERATOR",
    token: "e2e-generator-token",
  },
  collector: {
    id: "e2e-collector-001",
    role: "WASTE_COLLECTOR",
    token: "e2e-collector-token",
  },
  deliveryman: {
    id: "e2e-deliveryman-001",
    role: "DELIVERYMAN",
    token: "e2e-deliveryman-token",
  },
} as const;

export const pendingCollectionFixture = {
  id: "e2e-collection-request-001",
  status: "IN_PROGRESS",
  generatorId: completionActors.generator.id,
  collectorId: completionActors.collector.id,
  deliverymanId: completionActors.deliveryman.id,
  completionId: "e2e-completion-001",
  materialIds: ["synthetic-paper"],
  weight: 3,
  createdAt: "2026-11-01T12:00:00Z",
  updatedAt: "2026-11-01T12:30:00Z",
} as const;
