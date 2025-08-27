import {
  UserRole,
  CollectionPermission,
  DocumentPermission,
} from "@shared/types";
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

    it("should have restricted permissions even with explicit membership", async () => {
      const team = await buildTeam();
      const guest = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });
      // Create a dummy collection first to avoid "last collection" constraint
      await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null, // Private collection
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });

      // Give guest explicit read access to the document
      await document.$add("membership", guest, {
        through: {
          permission: DocumentPermission.Read,
          createdById: guest.id,
        },
      });

      // Reload document to get memberships
      const reloadedDocument = await document.reload({
        paranoid: false,
        include: [
          {
            association: "memberships",
          },
          {
            association: "groupMemberships",
          },
        ],
      });

      const abilities = serialize(guest, reloadedDocument);

      // Guest should have read access when explicitly granted
      expect(abilities.read).toBe(true);

      // But should not have revision/view access (listRevisions and listViews require update permission for guests)
      expect(abilities.listRevisions).toBe(false);
      expect(abilities.listViews).toBe(false);

      // Should not be able to share, download (unless team allows), or manage
      expect(abilities.share).toBe(false);
      expect(abilities.manageUsers).toBe(false);
      expect(abilities.createChildDocument).toBe(false);
      expect(abilities.move).toBe(false);

      // Commenting should work if guest can read and has no update permission exception
      expect(abilities.comment).toBe(false); // Guests need update permission to comment
    });

    it("should be able to comment and see history when they have update permission", async () => {
      const team = await buildTeam();
      const guest = await buildUser({
        role: UserRole.Guest,
        teamId: team.id,
      });
      // Create a dummy collection first to avoid "last collection" constraint
      await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null, // Private collection
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });

      // Give guest explicit read-write access to the document
      await document.$add("membership", guest, {
        through: {
          permission: DocumentPermission.ReadWrite,
          createdById: guest.id,
        },
      });

      // Reload document to get memberships
      const reloadedDocument = await document.reload({
        paranoid: false,
        include: [
          {
            association: "memberships",
          },
          {
            association: "groupMemberships",
          },
        ],
      });

      const abilities = serialize(guest, reloadedDocument);

      // With update permission, guests can comment and see history
      expect(abilities.read).toBe(true);
      expect(abilities.update).toBe(true);
      expect(abilities.comment).toBe(true);
      expect(abilities.listRevisions).toBe(true);
      expect(abilities.listViews).toBe(true);

      // But still restricted from certain actions
      expect(abilities.createChildDocument).toBe(true); // Can create child docs if can update
      expect(abilities.manageUsers).toBe(true); // Can manage users if can update
      expect(abilities.share).toBe(false); // Guest users cannot share
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
