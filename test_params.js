const meetingId = "550e8400-e29b-41d4-a716-446655440000";
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meetingId || "");
console.log("Valid UUID match:", isUuid);

const invalidId = "undefined";
const isUuidInvalid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invalidId || "");
console.log("Invalid UUID match:", isUuidInvalid);

const paramsResolved = { id: "123", meetingId: "550e8400-e29b-41d4-a716-446655440000" };
console.log("Extracted ID:", paramsResolved?.id);
console.log("Extracted meetingId:", paramsResolved?.meetingId);
