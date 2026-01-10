import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Search, 
  Bell, 
  Home,
  MessageSquare,
  Clock,
  MapPin,
  Settings,
  Video,
  Play
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserDocument } from "@/integrations/firebase/users";
import { Link, useNavigate } from "react-router-dom";
import VideoPostForm from "@/components/video/VideoPostForm";

const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null }>({ full_name: null });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const userDoc = await getUserDocument(user.uid);
        if (userDoc?.profile) {
          setProfile({ full_name: userDoc.profile.fullName });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [user]);

  const recentSearches = [
    { query: '3 bedroom house in Kololo', date: '2 days ago' },
    { query: 'Land for sale Wakiso', date: '5 days ago' },
    { query: 'Apartments Ntinda', date: '1 week ago' },
  ];

  const savedProperties: Array<{ title: string; price: string; location: string }> = [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      <Header />

      <main className="flex-1 py-4 sm:py-8">
        <div className="container space-y-4 sm:space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-semkat-sky text-xs sm:text-sm font-medium">My Dashboard</p>
              <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold truncate">
                Welcome, {profile.full_name || 'User'}
              </h1>
              <p className="text-white/60 text-xs sm:text-sm mt-1 truncate">{user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <VideoPostForm 
                onSuccess={() => navigate('/explore', { state: { fromUpload: true } })}
                triggerLabel="Post Video"
                triggerClassName="text-xs sm:text-sm"
              />
              <Link to="/explore">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Watch</span> Videos
                </Button>
              </Link>
              <Link to="/properties">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Browse</span> Properties
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="text-white/70 hover:bg-white/10 text-xs sm:text-sm" 
                onClick={signOut}
              >
                Sign out
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            <Link to="/explore">
              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 text-white p-3 sm:p-5 hover:border-purple-500/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20">
                    <Video className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Explore</p>
                    <p className="text-white/60 text-[10px] sm:text-sm hidden xs:block">Watch videos</p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link to="/properties">
              <Card className="bg-gradient-to-br from-semkat-orange/20 to-semkat-orange/5 border-semkat-orange/20 text-white p-3 sm:p-5 hover:border-semkat-orange/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-semkat-orange/20">
                    <Home className="h-4 w-4 sm:h-5 sm:w-5 text-semkat-orange" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Properties</p>
                    <p className="text-white/60 text-[10px] sm:text-sm hidden xs:block">Browse listings</p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link to="/favorites">
              <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/20 text-white p-3 sm:p-5 hover:border-red-500/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/20">
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Favorites</p>
                    <p className="text-white/60 text-[10px] sm:text-sm hidden xs:block">{savedProperties.length} saved</p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link to="/settings">
              <Card className="bg-gradient-to-br from-semkat-sky/20 to-semkat-sky/5 border-semkat-sky/20 text-white p-3 sm:p-5 hover:border-semkat-sky/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-semkat-sky/20">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-semkat-sky" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Settings</p>
                    <p className="text-white/60 text-[10px] sm:text-sm hidden xs:block">Preferences</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Video CTA Card */}
          <Card className="bg-gradient-to-r from-semkat-orange/20 via-purple-500/10 to-semkat-sky/20 border-white/10 text-white p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
                <div className="p-2 sm:p-3 rounded-full bg-white/10">
                  <Video className="h-6 w-6 sm:h-8 sm:w-8 text-semkat-orange" />
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-semibold">Share Your Experience</h3>
                  <p className="text-white/60 text-xs sm:text-sm">Post videos to explore and connect with the community</p>
                </div>
              </div>
              <VideoPostForm 
                onSuccess={() => navigate('/explore', { state: { fromUpload: true } })}
                triggerLabel="Post a Video"
                triggerClassName="whitespace-nowrap"
              />
            </div>
          </Card>

          {/* Main Content */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Saved Properties */}
            <Card className="bg-white/5 border-white/10 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-heading text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                  Saved Properties
                </h3>
                <Link to="/favorites">
                  <Button variant="ghost" size="sm" className="text-semkat-sky hover:text-semkat-sky/80 text-xs sm:text-sm">
                    View all
                  </Button>
                </Link>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {savedProperties.length === 0 ? (
                  <p className="text-white/60 text-center py-6 sm:py-8 text-sm">No saved properties yet</p>
                ) : (
                  savedProperties.map((property, i) => (
                    <div key={i} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm sm:text-base truncate">{property.title}</h4>
                        <p className="text-semkat-orange text-xs sm:text-sm font-semibold">{property.price}</p>
                        <p className="text-white/50 text-[10px] sm:text-xs flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {property.location}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-xs ml-2">
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Searches */}
            <Card className="bg-white/5 border-white/10 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-heading text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-semkat-sky" />
                  Recent Searches
                </h3>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {recentSearches.map((search, i) => (
                  <div key={i} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{search.query}</p>
                      <p className="text-white/50 text-[10px] sm:text-xs flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {search.date}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-semkat-orange hover:text-semkat-orange/80 text-xs ml-2">
                      Search
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Messages Section */}
          <Card className="bg-white/5 border-white/10 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-heading text-base sm:text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                Recent Conversations
              </h3>
            </div>
            <div className="text-center py-6 sm:py-8 text-white/60">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No conversations yet</p>
              <p className="text-xs sm:text-sm mt-1">Contact an agent to start a conversation</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
