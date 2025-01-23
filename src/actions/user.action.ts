"use server";

import { prisma } from "@/lib/prisma";
// this is a server action that can be used in clien components

// clerk an our database are two different servers

import { auth, currentUser } from "@clerk/nextjs/server";
import { error } from "console";
import { revalidatePath } from "next/cache";
export async function syncUser() {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId || !user) return;

    // check if user exist
    const userExist = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });

    if (userExist) {
      return userExist;
    }
    const dbUser = prisma.user.create({
      data: {
        clerkId: userId,
        name: `${user.firstName || ""} ${user.lastName || ""}`,
        username:
          user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
        email: user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
      },
    });

    return dbUser;
  } catch (error) {
    console.error("Error in syncUser ", error);
  }
}

export async function getUserByClerkId(clerkId: string) {
  return await prisma.user.findUnique({
    where: {
      clerkId: clerkId,
    },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });
}

export async function getDbUserId() {
  const { userId: clerkId } = await auth(); // rename default object to clarkId
  if (!clerkId) return null;
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error("User not found");
  return user.id;
}

export async function getRandomUsers() {
  try {
    const userId = await getDbUserId();
    if (!userId) return [];

    // get 3 random user exclude ourselv and users that we already follow
    const randomUsers = await prisma.user.findMany({
      where: {
        AND: [
          {
            NOT: { id: userId },
          },
          {
            NOT: {
              followers: {
                some: {
                  followerId: userId,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: 3, // take 3 users
    });

    return randomUsers;
  } catch (error) {
    console.error("Error fetching random users: ", error);
    return [];
  }
}

export async function toggleFollow(targetUserId: string) {
  try {
    const userId = await getDbUserId();

    if (userId === targetUserId) throw new Error("You cant follow yourself");

    if (!userId) return;
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // unfollow
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
    } else {
      //follow
      // tarnsaction is used to handle multiple CRUD operations
      //  on database at the same time that are all going to be successfull or denied
      await prisma.$transaction([
        prisma.follows.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        }),
        prisma.notification.create({
          data: {
            type: "FOLLOW",
            userId: targetUserId, // user being followed
            creatorId: userId, // user following
          },
        }),
      ]);
    }

    revalidatePath("/"); // update the UI By purging removing the cashed data
    return { success: true };
  } catch (error) {
    console.error("Error in toggleFollow: ", error);
    return { success: false, error: "Error toggling follow" };
  }
}
