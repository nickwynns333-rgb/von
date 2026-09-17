import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAffiliates from "./pages/admin/AdminAffiliates";
import AdminDataMarketplace from "./pages/admin/AdminDataMarketplace";
import AdminWhiteLabel from "./pages/admin/AdminWhiteLabel";
import AdminTools from "./pages/admin/AdminTools";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCredits from "./pages/admin/AdminCredits";
import AdminModels from "./pages/admin/AdminModels";
import AdminSystem from "./pages/admin/AdminSystem";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";

// Agency pages
import AgencyDashboard from "./pages/agency/AgencyDashboard";
import WhiteLabelPortal from "./pages/agency/WhiteLabelPortal";
import AgencyClients from "./pages/agency/AgencyClients";
import AgencyAnalytics from "./pages/agency/AgencyAnalytics";
import AgencyCredits from "./pages/agency/AgencyCredits";
import AgencySettings from "./pages/agency/AgencySettings";

// Affiliate pages
import AffiliateDashboard from "./pages/affiliate/AffiliateDashboard";

// Customer pages
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import AgentEditor from "./pages/customer/AgentEditor";
import AppointmentsPage from "./pages/customer/Appointments";
import ChatWidgets from "./pages/customer/ChatWidgets";
import DataMarketplace from "./pages/customer/DataMarketplace";
import KnowledgeBase from "./pages/customer/KnowledgeBase";
import MasterChat from "./pages/customer/MasterChat";
import ResourceDashboard from "./pages/customer/ResourceDashboard";
import SubAccounts from "./pages/customer/SubAccounts";
import Telephony from "./pages/customer/Telephony";
import VoiceAgents from "./pages/customer/VoiceAgents";
import ChatAgents from "./pages/customer/ChatAgents";
import PerformanceOverview from "./pages/customer/PerformanceOverview";
import DashboardCredits from "./pages/customer/DashboardCredits";
import DashboardSettings from "./pages/customer/DashboardSettings";
import DashboardSubscription from "./pages/customer/DashboardSubscription";

// Meeting pages
import MeetingRoom from "./pages/meetings/MeetingRoom";
import LiveMeetingRoom from "./pages/meetings/LiveMeetingRoom";
import PresentationBuilder from "./pages/meetings/PresentationBuilder";
import WaitingRoom from "./pages/meetings/WaitingRoom";
import PostMeetingSummary from "./pages/meetings/PostMeetingSummary";
import AvatarStudio from "./pages/AvatarStudio";
import VoiceStudio from "./pages/VoiceStudio";
import SEODashboard from "./pages/SEODashboard";
import SEOPricing from "./pages/SEOPricing";
import MemoryBrain from "./pages/MemoryBrain";
import AICFODashboard from "./pages/AICFODashboard";
import AICFOPricing from "./pages/AICFOPricing";
import IndianTeamPortal from "./pages/IndianTeamPortal";
import CommunicationsHub from "./pages/CommunicationsHub";
import CRMPage from "./pages/CRMPage";
import PayrollPage from "./pages/PayrollPage";
import LegalPage from "./pages/LegalPage";
import CollectionsPage from "./pages/CollectionsPage";
import AISalesPage from "./pages/AISalesPage";
import AIMarketingPage from "./pages/AIMarketingPage";
import AIAnalyticsPage from "./pages/AIAnalyticsPage";
import CallCenterPage from "./pages/CallCenterPage";
import BroadcastCenter from "./pages/BroadcastCenter";
import AccountingPage from "./pages/AccountingPage";
import PartnersPage from "./pages/PartnersPage";

// Scheduler
import SchedulerPage from "./pages/SchedulerPage";
import PublicBookingPage from "./pages/PublicBookingPage";
import VonWorkHub from "./pages/VonWorkHub";
import AdminVonWork from "./pages/AdminVonWork";
import WebsiteRebuilder from "./pages/WebsiteRebuilder";
import WebsitePreview from "./pages/WebsitePreview";
import MySites from "./pages/MySites";
import HFNPricing from "./pages/HFNPricing";
import JoinForcePricing from "./pages/JoinForcePricing";
import ProspectingStudio from "./pages/ProspectingStudio";
import ProspectDemoPage from "./pages/ProspectDemoPage";
import ProspectPresentationPage from "./pages/ProspectPresentationPage";
import SocialControlCenter from "./pages/SocialControlCenter";

// FSM pages
import FSMHub from "./pages/fsm/FSMHub";
import FSMJobs from "./pages/fsm/FSMJobs";
import FSMCustomerReport from "./pages/fsm/FSMCustomerReport";
import FSMTechnicians from "./pages/fsm/FSMTechnicians";
import FSMPreCalls from "./pages/fsm/FSMPreCalls";

// Portal
import ClientPortal from "./pages/portal/ClientPortal";

function Router() {
  return (
    <Switch>
      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/" component={Home} />

      {/* ── Admin ──────────────────────────────────────────── */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/affiliates" component={AdminAffiliates} />
      <Route path="/admin/white-label" component={AdminWhiteLabel} />
      <Route path="/admin/data-marketplace" component={AdminDataMarketplace} />
      <Route path="/admin/tools" component={AdminTools} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/credits" component={AdminCredits} />
      <Route path="/admin/models" component={AdminModels} />
      <Route path="/admin/system" component={AdminSystem} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      {/* catch-all admin → AdminDashboard */}
      <Route path="/admin/:rest*" component={AdminDashboard} />

      {/* ── Agency ─────────────────────────────────────────── */}
      <Route path="/agency/white-label" component={WhiteLabelPortal} />
      <Route path="/agency/clients" component={AgencyClients} />
      <Route path="/agency/analytics" component={AgencyAnalytics} />
      <Route path="/agency/credits" component={AgencyCredits} />
      <Route path="/agency/settings" component={AgencySettings} />
      <Route path="/agency" component={AgencyDashboard} />
      {/* catch-all agency → AgencyDashboard */}
      <Route path="/agency/:rest*" component={AgencyDashboard} />

      {/* ── Affiliate / Partner ────────────────────────────── */}
      <Route path="/affiliate" component={AffiliateDashboard} />
      <Route path="/affiliate/:rest*" component={AffiliateDashboard} />
      <Route path="/partner" component={AffiliateDashboard} />

      {/* ── Customer Dashboard sub-pages (specific first) ──── */}
      <Route path="/dashboard/voice-agents" component={VoiceAgents} />
      <Route path="/dashboard/chat-agents" component={ChatAgents} />
      <Route path="/dashboard/performance" component={PerformanceOverview} />
      <Route path="/dashboard/appointments" component={AppointmentsPage} />
      <Route path="/dashboard/data-marketplace" component={DataMarketplace} />
      <Route path="/dashboard/master-chat" component={MasterChat} />
      <Route path="/dashboard/sub-accounts" component={SubAccounts} />
      <Route path="/dashboard/knowledge" component={KnowledgeBase} />
      <Route path="/dashboard/usage" component={ResourceDashboard} />
      <Route path="/dashboard/resource" component={ResourceDashboard} />
      <Route path="/dashboard/telephony" component={Telephony} />
      <Route path="/dashboard/widgets" component={ChatWidgets} />
      <Route path="/dashboard/credits" component={DashboardCredits} />
      <Route path="/dashboard/settings" component={DashboardSettings} />
      <Route path="/dashboard/subscription" component={DashboardSubscription} />
      <Route path="/dashboard/agents/:id" component={AgentEditor} />
      <Route path="/dashboard/agents" component={CustomerDashboard} />
      <Route path="/dashboard/presentations" component={PresentationBuilder} />
      {/* catch-all customer → CustomerDashboard */}
      <Route path="/dashboard" component={CustomerDashboard} />
      <Route path="/dashboard/:rest*" component={CustomerDashboard} />

      {/* ── Standalone tools ───────────────────────────────── */}
      <Route path="/presentations" component={PresentationBuilder} />
      <Route path="/knowledge" component={KnowledgeBase} />
      <Route path="/knowledge/:rest*" component={KnowledgeBase} />
      <Route path="/telephony" component={Telephony} />
      <Route path="/widgets" component={ChatWidgets} />

      {/* ── Client portal (white-labeled) ──────────────────── */}
      <Route path="/portal" component={ClientPortal} />
      <Route path="/portal/:rest*" component={ClientPortal} />

      {/* ── AI Meeting ─────────────────────────────────────── */}
      <Route path="/meet/:slug/room" component={LiveMeetingRoom} />
      <Route path="/meet/:slug" component={WaitingRoom} />
      <Route path="/meeting/:slug" component={MeetingRoom} />
      <Route path="/meeting-summary" component={PostMeetingSummary} />

      {/* ── Chat Agents & Voice Agents standalone routes ──── */}
      <Route path="/agents" component={ChatAgents} />
      <Route path="/telephony-agents" component={VoiceAgents} />

      {/* ── Avatar & Voice Studio ──────────────────────────── */}
      <Route path="/agents/:id/avatar-studio" component={AvatarStudio} />
      <Route path="/agents/:id/voice-studio" component={VoiceStudio} />

      {/* ── AI SEO ─────────────────────────────────────────── */}
      <Route path="/seo/pricing" component={SEOPricing} />
      <Route path="/seo" component={SEODashboard} />

      {/* ── Memory Brain ───────────────────────────────────── */}
      <Route path="/memory" component={MemoryBrain} />

      {/* AI CFO */}
      <Route path="/aicfo/pricing" component={AICFOPricing} />
      <Route path="/aicfo" component={AICFODashboard} />

      {/* Indian Team Portal */}
      <Route path="/indian-team" component={IndianTeamPortal} />

      {/* VonWork OS Modules */}
      <Route path="/communications" component={CommunicationsHub} />
      <Route path="/social-control" component={SocialControlCenter} />
      <Route path="/crm" component={CRMPage} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/collections" component={CollectionsPage} />
      <Route path="/sales" component={AISalesPage} />
      <Route path="/marketing" component={AIMarketingPage} />
      <Route path="/analytics" component={AIAnalyticsPage} />
      <Route path="/call-center" component={CallCenterPage} />
      <Route path="/broadcast" component={BroadcastCenter} />
      <Route path="/accounting" component={AccountingPage} />
      <Route path="/partners" component={PartnersPage} />

      {/* AI Scheduler */}
      <Route path="/appointments" component={SchedulerPage} />
      <Route path="/book/:slug" component={PublicBookingPage} />
      {/* VON WORK Qualification Hub */}
      <Route path="/vonwork" component={VonWorkHub} />
      <Route path="/admin/vonwork" component={AdminVonWork} />
      <Route path="/hfn-pricing" component={HFNPricing} />
      <Route path="/joinforce-pricing" component={JoinForcePricing} />
      {/* AI Website Rebuilder */}
      <Route path="/website-builder" component={WebsiteRebuilder} />
      <Route path="/website-preview/:siteId" component={WebsitePreview} />
      <Route path="/my-sites" component={MySites} />
      <Route path="/prospecting" component={ProspectingStudio} />
      <Route path="/prospect-demo/:slug" component={ProspectDemoPage} />
      <Route path="/prospect-presentation/:slug" component={ProspectPresentationPage} />
      {/* FSM — AI Field Service Management */}
      <Route path="/fsm" component={FSMHub} />
      <Route path="/fsm/jobs" component={FSMJobs} />
      <Route path="/fsm/reports" component={FSMCustomerReport} />
      <Route path="/fsm/technicians" component={FSMTechnicians} />
      <Route path="/fsm/pre-calls" component={FSMPreCalls} />

      {/* ── 404 ────────────────────────────────────────────── */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
