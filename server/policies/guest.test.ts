import { UserRole, CollectionPermission } from "@shared/types";
import {
  buildDocument,
  buildUser,
  buildCollection,
  buildTeam,
} from "@server/test/factories";
import { serialize } from "./index";

describe("Guest User Policies", () => {
  describe("Default permissions", () => {
    it("should have no access to team collections without explicit membership", async () => {
      const team = await buildTeam();
      const guest = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        // Public collection that regular users can access
        permission: CollectionPermission.ReadWrite,
      });

      const abilities = serialize(guest, collection);
      expect(abilities.read).toBe(false);
      expect(abilities.readDocument).toBe(false);
      expect(abilities.createDocument).toBe(false);
      expect(abilities.update).toBe(false);
      expect(abilities.share).toBe(false);
      expect(abilities.archive).toBe(false);
    });

    it("should have no access to team documents without explicit membership", async () => {
      const team = await buildTeam();
      const guest = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });

      const abilities = serialize(guest, document);
      expect(abilities.read).toBe(false);
      expect(abilities.update).toBe(false);
      expect(abilities.createChildDocument).toBe(false);
      expect(abilities.manageUsers).toBe(false);
      expect(abilities.archive).toBe(false);
      expect(abilities.delete).toBe(false);
      expect(abilities.share).toBe(false);
      expect(abilities.move).toBe(false);
      expect(abilities.comment).toBe(false);
      expect(abilities.download).toBe(false);
      expect(abilities.listRevisions).toBe(false);
      expect(abilities.listViews).toBe(false);
    });
  });

  describe("Team permissions", () => {
    it("should not be able to create collections", async () => {
      const team = await buildTeam();
      const guest = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });

      const abilities = serialize(guest, team);
      expect(abilities.createCollection).toBe(false);
    });

    it("should not be able to create documents at team level", async () => {
      const team = await buildTeam();
      const guest = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });

      const abilities = serialize(guest, team);
      expect(abilities.createDocument).toBe(false);
    });
  });
});
