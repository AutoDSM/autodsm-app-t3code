import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

export const TrimmedString = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformOrFail({
      decode: (value) => Effect.succeed(value.trim()),
      encode: (value) => Effect.succeed(value.trim()),
    }),
  ),
);
export const TrimmedNonEmptyString = TrimmedString.check(Schema.isNonEmpty());

export const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
export const PositiveInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));
export const PortSchema = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 }));

export const IsoDateTime = Schema.String;
export type IsoDateTime = typeof IsoDateTime.Type;

/**
 * Construct a branded identifier. Enforces non-empty trimmed strings
 */
const makeEntityId = <Brand extends string>(brand: Brand) => {
  return TrimmedNonEmptyString.pipe(Schema.brand(brand));
};

export const ThreadId = makeEntityId("ThreadId");
export type ThreadId = typeof ThreadId.Type;
export const ProjectId = makeEntityId("ProjectId");
export type ProjectId = typeof ProjectId.Type;
export const EnvironmentId = makeEntityId("EnvironmentId");
export type EnvironmentId = typeof EnvironmentId.Type;
export const CommandId = makeEntityId("CommandId");
export type CommandId = typeof CommandId.Type;
export const EventId = makeEntityId("EventId");
export type EventId = typeof EventId.Type;
export const MessageId = makeEntityId("MessageId");
export type MessageId = typeof MessageId.Type;
export const TurnId = makeEntityId("TurnId");
export type TurnId = typeof TurnId.Type;
export const AuthSessionId = makeEntityId("AuthSessionId");
export type AuthSessionId = typeof AuthSessionId.Type;

export const ProviderItemId = makeEntityId("ProviderItemId");
export type ProviderItemId = typeof ProviderItemId.Type;
export const RuntimeSessionId = makeEntityId("RuntimeSessionId");
export type RuntimeSessionId = typeof RuntimeSessionId.Type;
export const RuntimeItemId = makeEntityId("RuntimeItemId");
export type RuntimeItemId = typeof RuntimeItemId.Type;
export const RuntimeRequestId = makeEntityId("RuntimeRequestId");
export type RuntimeRequestId = typeof RuntimeRequestId.Type;
export const RuntimeTaskId = makeEntityId("RuntimeTaskId");
export type RuntimeTaskId = typeof RuntimeTaskId.Type;
export const ApprovalRequestId = makeEntityId("ApprovalRequestId");
export type ApprovalRequestId = typeof ApprovalRequestId.Type;
export const CheckpointRef = makeEntityId("CheckpointRef");
export type CheckpointRef = typeof CheckpointRef.Type;

/** Stable component identity within a workspace (content-derived). */
export const AutoDsmComponentId = makeEntityId("AutoDsmComponentId");
export type AutoDsmComponentId = typeof AutoDsmComponentId.Type;

export const AutoDsmRegistryEntryId = makeEntityId("AutoDsmRegistryEntryId");
export type AutoDsmRegistryEntryId = typeof AutoDsmRegistryEntryId.Type;

export const AutoDsmRenderPlanId = makeEntityId("AutoDsmRenderPlanId");
export type AutoDsmRenderPlanId = typeof AutoDsmRenderPlanId.Type;

export const AutoDsmRenderManifestId = makeEntityId("AutoDsmRenderManifestId");
export type AutoDsmRenderManifestId = typeof AutoDsmRenderManifestId.Type;

export const AutoDsmScanArtifactId = makeEntityId("AutoDsmScanArtifactId");
export type AutoDsmScanArtifactId = typeof AutoDsmScanArtifactId.Type;

export const AutoDsmChangeSetId = makeEntityId("AutoDsmChangeSetId");
export type AutoDsmChangeSetId = typeof AutoDsmChangeSetId.Type;

export const AutoDsmPublishedSnapshotId = makeEntityId("AutoDsmPublishedSnapshotId");
export type AutoDsmPublishedSnapshotId = typeof AutoDsmPublishedSnapshotId.Type;

export const AutoDsmGenerationPlanId = makeEntityId("AutoDsmGenerationPlanId");
export type AutoDsmGenerationPlanId = typeof AutoDsmGenerationPlanId.Type;
