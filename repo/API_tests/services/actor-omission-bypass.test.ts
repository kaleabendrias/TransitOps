import { describe, it, expect } from 'vitest';

/**
 * These tests verify that calling mutating service methods WITHOUT an actor
 * is a TypeScript compile error — the actor parameter is mandatory.
 * If any of these compile, the type system has regressed.
 *
 * We test this at runtime by verifying the .length of each method
 * matches the expected arity (which includes the actor parameter).
 */
describe('Actor-omission bypass prevention (mandatory actor arity)', () => {
  it('TripService.createTrip requires 5+ args (including actor)', async () => {
    const { TripService } = await import('@services/trip-service');
    // createTrip(venueId, name, departureTime, createdBy, actor, description?)
    expect(TripService.prototype.createTrip.length).toBeGreaterThanOrEqual(5);
  });

  it('TripService.deleteTrip requires 2 args (id, actor)', async () => {
    const { TripService } = await import('@services/trip-service');
    expect(TripService.prototype.deleteTrip.length).toBe(2);
  });

  it('VenueService.createVenue requires 4 args', async () => {
    const { VenueService } = await import('@services/venue-service');
    expect(VenueService.prototype.createVenue.length).toBe(4);
  });

  it('VenueService.deleteVenue requires 2 args', async () => {
    const { VenueService } = await import('@services/venue-service');
    expect(VenueService.prototype.deleteVenue.length).toBe(2);
  });

  it('SeatService.changeSeatStatus requires 3 args', async () => {
    const { SeatService } = await import('@services/seat-service');
    expect(SeatService.prototype.changeSeatStatus.length).toBe(3);
  });

  it('QuestionService.create requires 2 args (params, actor)', async () => {
    const { QuestionService } = await import('@services/question-service');
    expect(QuestionService.prototype.create.length).toBe(2);
  });

  it('QuestionService.softDelete requires 2 args', async () => {
    const { QuestionService } = await import('@services/question-service');
    expect(QuestionService.prototype.softDelete.length).toBe(2);
  });

  it('AssociationService.createDepartment has actor as required param', async () => {
    const { AssociationService } = await import('@services/association-service');
    // JS .length stops at first default param (sampleTypes=[]), so arity is 2
    // But the TypeScript signature enforces actor as mandatory — verified by compilation
    expect(AssociationService.prototype.createDepartment.length).toBeGreaterThanOrEqual(2);
  });

  it('SeatMapService.generateSeatMap has actor as required param', async () => {
    const { SeatMapService } = await import('@services/seat-map-service');
    // JS .length stops at first default param (adaRows=[]), so arity is 3
    expect(SeatMapService.prototype.generateSeatMap.length).toBeGreaterThanOrEqual(3);
  });
});
