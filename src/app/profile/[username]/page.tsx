import {
  getProfileByUsername,
  getUserLikedPosts,
  getUserPosts,
  isFollowing,
} from "@/actions/profile.action";
import { notFound } from "next/navigation";
import ProfilePageClient from "./ProfilePageClient";
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: Promise<{ username: string }>;
};

// change title of the web page to user's name or user's username
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata | null> {
  // read route params
  const username = (await params).username;

  // fetch data
  const user = await getProfileByUsername(username);
  if (!user) return Promise.resolve(null);

  return {
    title: `${user.name ?? user.username}`,
    openGraph: {
      description: user.bio || `Check out ${user.username}'s profile.`,
    },
  };
}

async function ProfilePageServer({ params }: Props) {
  const { username } = await params;
  const user = await getProfileByUsername(username);

  if (!user) notFound();

  const [posts, likedPosts, isCurrentUserFollowing] = await Promise.all([
    getUserPosts(user.id),
    getUserLikedPosts(user.id),
    isFollowing(user.id),
  ]);

  return (
    <ProfilePageClient
      user={user}
      posts={posts}
      likedPosts={likedPosts}
      isFollowing={isCurrentUserFollowing}
    />
  );
}
export default ProfilePageServer;
