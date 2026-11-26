import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GifsModule } from './gifs/gifs.module';
import { UploadsModule } from './uploads/uploads.module';
import { FriendsModule } from './friends/friends.module';
import { PresenceModule } from './presence/presence.module';
import { CommunitiesModule } from './communities/communities.module';
import { ChannelsModule } from './channels/channels.module';
import { MessagesModule } from './messages/messages.module';
import { RolesModule } from './roles/roles.module';
import { InvitesModule } from './invites/invites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DmsModule } from './dms/dms.module';
import { VoiceModule } from './voice/voice.module';
import { HealthController } from './health/health.controller';
import { ReportsModule } from './reports/reports.module';
import { GamesModule } from './games/games.module';
import { TeamsModule } from './teams/teams.module';
import { PartiesModule } from './parties/parties.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { RankingModule } from './ranking/ranking.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { CompetitiveIntegrityModule } from './competitive-integrity/competitive-integrity.module';
import { PenaltiesModule } from './penalties/penalties.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    GifsModule,
    UploadsModule,
    FriendsModule,
    PresenceModule,
    CommunitiesModule,
    ChannelsModule,
    MessagesModule,
    RolesModule,
    InvitesModule,
    NotificationsModule,
    DmsModule,
    VoiceModule,
    ReportsModule,
    GamesModule,
    TeamsModule,
    PartiesModule,
    MatchmakingModule,
    RankingModule,
    TournamentsModule,
    CompetitiveIntegrityModule,
    PenaltiesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}