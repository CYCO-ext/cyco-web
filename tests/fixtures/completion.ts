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
  status: "ON_THE_WAY",
  generatorId: completionActors.generator.id,
  collectorId: completionActors.collector.id,
  deliverymanId: completionActors.deliveryman.id,
  completionId: "e2e-completion-001",
} as const;
