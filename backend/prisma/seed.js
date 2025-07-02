const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create admin user (your account)
    const adminUser = await prisma.user.upsert({
      where: { email: 'hiphoorykiko@gmail.com' },
      update: {
        isActive: true,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isEmailVerified: true,
        lastLoginAt: new Date(),
      },
      create: {
        email: 'hiphoorykiko@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        googleId: 'seed_google_id_admin',
        isEmailVerified: true,
        isActive: true,
        lastLoginAt: new Date(),
      },
    });

    console.log('✅ Admin user created/updated:', adminUser.email);

    // Create sample judge users
    const judgesData = [
      {
        email: 'judge1@university.edu',
        firstName: 'Emily',
        lastName: 'Chen',
        role: 'judge',
        googleId: 'seed_google_id_judge1',
      },
      {
        email: 'judge2@college.edu',
        firstName: 'Michael',
        lastName: 'Rodriguez',
        role: 'judge',
        googleId: 'seed_google_id_judge2',
      },
      {
        email: 'judge3@institute.edu',
        firstName: 'Sarah',
        lastName: 'Thompson',
        role: 'judge',
        googleId: 'seed_google_id_judge3',
      },
      {
        email: 'judge4@academy.edu',
        firstName: 'David',
        lastName: 'Kim',
        role: 'judge',
        googleId: 'seed_google_id_judge4',
      },
      {
        email: 'judge5@school.edu',
        firstName: 'Jennifer',
        lastName: 'Davis',
        role: 'judge',
        googleId: 'seed_google_id_judge5',
      },
      {
        email: 'judge6@ethics.edu',
        firstName: 'Robert',
        lastName: 'Wilson',
        role: 'judge',
        googleId: 'seed_google_id_judge6',
      },
      {
        email: 'judge7@philosophy.edu',
        firstName: 'Lisa',
        lastName: 'Anderson',
        role: 'judge',
        googleId: 'seed_google_id_judge7',
      },
      {
        email: 'judge8@moral.edu',
        firstName: 'James',
        lastName: 'Miller',
        role: 'judge',
        googleId: 'seed_google_id_judge8',
      },
      {
        email: 'ethicsbowla@gmail.com',
        firstName: 'Alex',
        lastName: 'Ethics',
        role: 'judge',
        googleId: 'seed_google_id_judge9',
      }
    ];

    // Create sample moderator users
    const moderatorsData = [
      {
        email: 'moderator1@university.edu',
        firstName: 'Professor',
        lastName: 'Martinez',
        role: 'moderator',
        googleId: 'seed_google_id_mod1',
      },
      {
        email: 'moderator2@college.edu',
        firstName: 'Dr. Angela',
        lastName: 'Foster',
        role: 'moderator',
        googleId: 'seed_google_id_mod2',
      },
      {
        email: 'moderator3@institute.edu',
        firstName: 'Prof. Kevin',
        lastName: 'Chang',
        role: 'moderator',
        googleId: 'seed_google_id_mod3',
      },
      {
        email: 'moderator4@academy.edu',
        firstName: 'Dr. Nicole',
        lastName: 'Johnson',
        role: 'moderator',
        googleId: 'seed_google_id_mod4',
      },
      {
        email: 'moderator5@school.edu',
        firstName: 'Prof. Mark',
        lastName: 'Taylor',
        role: 'moderator',
        googleId: 'seed_google_id_mod5',
      }
    ];

    // Create judges
    const createdJudges = [];
    for (const judgeData of judgesData) {
      const judge = await prisma.user.upsert({
        where: { email: judgeData.email },
        update: {
          isActive: true,
          role: judgeData.role,
          firstName: judgeData.firstName,
          lastName: judgeData.lastName,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
        create: {
          email: judgeData.email,
          firstName: judgeData.firstName,
          lastName: judgeData.lastName,
          role: judgeData.role,
          googleId: judgeData.googleId,
          isEmailVerified: true,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
      createdJudges.push(judge);
      console.log(`✅ Judge created/updated: ${judge.firstName} ${judge.lastName} (${judge.email})`);
    }

    // Create moderators
    const createdModerators = [];
    for (const moderatorData of moderatorsData) {
      const moderator = await prisma.user.upsert({
        where: { email: moderatorData.email },
        update: {
          isActive: true,
          role: moderatorData.role,
          firstName: moderatorData.firstName,
          lastName: moderatorData.lastName,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
        create: {
          email: moderatorData.email,
          firstName: moderatorData.firstName,
          lastName: moderatorData.lastName,
          role: moderatorData.role,
          googleId: moderatorData.googleId,
          isEmailVerified: true,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
      createdModerators.push(moderator);
      console.log(`✅ Moderator created/updated: ${moderator.firstName} ${moderator.lastName} (${moderator.email})`);
    }

    // Create sample events with new scoring criteria format
    const basicScoringCriteria = JSON.stringify({
      commentQuestionsCount: 3,
      commentMaxScore: 20,
      commentInstructions: 'Judge Questions Scoring Guide (20 points per question):\n\n1-5 points: The team answered the question but did not explain how it impacts their position\n6-10 points: The team answered the question clearly and explained its relevance to their stance\n11-15 points: The team made their position clearer in light of the question\n16-20 points: The team refined their position or provided a clear rationale for not refining it, demonstrating strong engagement\n\nNote: Judges typically score each question individually (First, Second, Third Question)',
      criteria: {
        clarity: { maxScore: 25, description: 'Clarity of argument and presentation' },
        analysis: { maxScore: 30, description: 'Depth of ethical analysis' },
        engagement: { maxScore: 25, description: 'Engagement with opposing arguments' }
      }
    });

    const advancedScoringCriteria = JSON.stringify({
      commentQuestionsCount: 4,
      commentMaxScore: 25,
      commentInstructions: 'Advanced Judge Questions Scoring Guide (25 points per question):\n\n1-6 points: Basic response with minimal engagement\n7-12 points: Clear response with some explanation\n13-18 points: Strong response with good reasoning\n19-25 points: Excellent response demonstrating deep understanding and sophisticated reasoning',
      criteria: {
        argumentation: { maxScore: 35, description: 'Quality of ethical argumentation' },
        reasoning: { maxScore: 35, description: 'Logical reasoning and consistency' },
        response: { maxScore: 30, description: 'Response to questions and challenges' }
      }
    });

    const eventsData = [
      {
        id: 'event-draft-2024',
        name: 'Regional Ethics Bowl 2024',
        description: 'Annual regional ethics bowl competition - still in preparation',
        totalRounds: 4,
        currentRound: 1,
        status: 'draft',
        eventDate: new Date('2024-03-15'),
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-03-16'),
        location: 'University Convention Center',
        maxTeams: 32,
        scoringCriteria: basicScoringCriteria,
      },
      {
        id: 'event-active-spring',
        name: 'Spring Ethics Challenge 2024',
        description: 'Active spring semester ethics competition',
        totalRounds: 3,
        currentRound: 2,
        status: 'active',
        eventDate: new Date('2024-01-20'),
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-21'),
        location: 'College Auditorium',
        maxTeams: 16,
        scoringCriteria: advancedScoringCriteria,
      },
      {
        id: 'event-completed-fall',
        name: 'Fall Ethics Tournament 2023',
        description: 'Completed fall semester tournament',
        totalRounds: 5,
        currentRound: 5,
        status: 'completed',
        eventDate: new Date('2023-11-10'),
        startDate: new Date('2023-11-10'),
        endDate: new Date('2023-11-12'),
        location: 'High School Gymnasium',
        maxTeams: 24,
        scoringCriteria: basicScoringCriteria,
      },
      {
        id: 'event-national-prep',
        name: 'National Championship Prep',
        description: 'Preparation event for national championship',
        totalRounds: 6,
        currentRound: 1,
        status: 'draft',
        eventDate: new Date('2024-04-01'),
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-03'),
        location: 'National Conference Center',
        maxTeams: 48,
        scoringCriteria: advancedScoringCriteria,
      },
      {
        id: 'event-mini-tournament',
        name: 'Mini Ethics Tournament',
        description: 'Small-scale tournament for new participants',
        totalRounds: 2,
        currentRound: 1,
        status: 'active',
        eventDate: new Date('2024-02-05'),
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-02-05'),
        location: 'Community Center',
        maxTeams: 8,
        scoringCriteria: JSON.stringify({
          commentQuestionsCount: 2,
          commentMaxScore: 15,
          commentInstructions: 'Simple scoring for beginners',
          criteria: {
            presentation: { maxScore: 40, description: 'Overall presentation quality' },
            understanding: { maxScore: 40, description: 'Understanding of ethical issues' }
          }
        }),
      }
    ];

    const createdEvents = [];
    for (const eventData of eventsData) {
      const event = await prisma.event.upsert({
        where: { id: eventData.id },
        update: {
          ...eventData,
          createdBy: adminUser.id,
        },
        create: {
          ...eventData,
          createdBy: adminUser.id,
        },
      });
      createdEvents.push(event);
      console.log(`✅ Event created/updated: ${event.name} (${event.status})`);
    }

    // Create sample teams for different events
    const teamsData = [
      // Teams for Regional Ethics Bowl 2024 (draft)
      {
        id: 'team-alpha',
        name: 'Team Alpha',
        school: 'University of Excellence',
        coachName: 'Dr. Alice Brown',
        coachEmail: 'alice.brown@uoe.edu',
        eventId: 'event-draft-2024',
      },
      {
        id: 'team-beta',
        name: 'Team Beta',
        school: 'College of Innovation',
        coachName: 'Prof. Bob Davis',
        coachEmail: 'bob.davis@coi.edu',
        eventId: 'event-draft-2024',
      },
      {
        id: 'team-gamma',
        name: 'Team Gamma',
        school: 'Institute of Ethics',
        coachName: 'Dr. Carol White',
        coachEmail: 'carol.white@ioe.edu',
        eventId: 'event-draft-2024',
      },
      {
        id: 'team-delta',
        name: 'Team Delta',
        school: 'Academy of Philosophy',
        coachName: 'Prof. David Green',
        coachEmail: 'david.green@aop.edu',
        eventId: 'event-draft-2024',
      },
      {
        id: 'team-epsilon',
        name: 'Team Epsilon',
        school: 'Ethics University',
        coachName: 'Dr. Eve Johnson',
        coachEmail: 'eve.johnson@eu.edu',
        eventId: 'event-draft-2024',
      },
      {
        id: 'team-zeta',
        name: 'Team Zeta',
        school: 'Moral Studies College',
        coachName: 'Prof. Frank Miller',
        coachEmail: 'frank.miller@msc.edu',
        eventId: 'event-draft-2024',
      },
      // Teams for Spring Ethics Challenge 2024 (active)
      {
        id: 'spring-warriors',
        name: 'Spring Warriors',
        school: 'State University',
        coachName: 'Dr. Emma Wilson',
        coachEmail: 'emma.wilson@su.edu',
        eventId: 'event-active-spring',
      },
      {
        id: 'ethics-pioneers',
        name: 'Ethics Pioneers',
        school: 'Community College',
        coachName: 'Prof. James Taylor',
        coachEmail: 'james.taylor@cc.edu',
        eventId: 'event-active-spring',
      },
      {
        id: 'moral-compass',
        name: 'Moral Compass',
        school: 'Technical Institute',
        coachName: 'Dr. Lisa Chen',
        coachEmail: 'lisa.chen@ti.edu',
        eventId: 'event-active-spring',
      },
      {
        id: 'virtue-squad',
        name: 'Virtue Squad',
        school: 'Philosophy Academy',
        coachName: 'Prof. Mark Anderson',
        coachEmail: 'mark.anderson@pa.edu',
        eventId: 'event-active-spring',
      },
      // Teams for completed Fall Tournament 2023
      {
        id: 'fall-champions',
        name: 'Fall Champions',
        school: 'Metropolitan University',
        coachName: 'Prof. Robert Martinez',
        coachEmail: 'robert.martinez@mu.edu',
        eventId: 'event-completed-fall',
      },
      {
        id: 'autumn-scholars',
        name: 'Autumn Scholars',
        school: 'Liberal Arts College',
        coachName: 'Dr. Sarah Johnson',
        coachEmail: 'sarah.johnson@lac.edu',
        eventId: 'event-completed-fall',
      },
      // Teams for Mini Tournament (active)
      {
        id: 'rookie-squad',
        name: 'Rookie Squad',
        school: 'High School Academy',
        coachName: 'Ms. Jennifer Adams',
        coachEmail: 'jennifer.adams@hsa.edu',
        eventId: 'event-mini-tournament',
      },
      {
        id: 'new-debaters',
        name: 'New Debaters',
        school: 'Prep School',
        coachName: 'Mr. Michael Brown',
        coachEmail: 'michael.brown@prep.edu',
        eventId: 'event-mini-tournament',
      },
      {
        id: 'future-philosophers',
        name: 'Future Philosophers',
        school: 'Central High School',
        coachName: 'Ms. Amanda Clark',
        coachEmail: 'amanda.clark@chs.edu',
        eventId: 'event-mini-tournament',
      },
      {
        id: 'young-ethicists',
        name: 'Young Ethicists',
        school: 'Riverside Academy',
        coachName: 'Mr. David Thompson',
        coachEmail: 'david.thompson@ra.edu',
        eventId: 'event-mini-tournament',
      },
      {
        id: 'moral-minds',
        name: 'Moral Minds',
        school: 'Westside School',
        coachName: 'Dr. Patricia Lee',
        coachEmail: 'patricia.lee@ws.edu',
        eventId: 'event-mini-tournament',
      },
      {
        id: 'ethics-explorers',
        name: 'Ethics Explorers',
        school: 'Northgate Institute',
        coachName: 'Mr. Steven Garcia',
        coachEmail: 'steven.garcia@ni.edu',
        eventId: 'event-mini-tournament',
      },
    ];

    const createdTeams = [];
    for (const teamData of teamsData) {
      const team = await prisma.team.upsert({
        where: { id: teamData.id },
        update: teamData,
        create: teamData,
      });
      createdTeams.push(team);
      console.log(`✅ Team created/updated: ${team.name} (${team.school})`);
    }

    // Create matches with different statuses for testing the new system
    const matchesData = [
      // Draft matches for Regional Ethics Bowl 2024
      {
        id: 'match-draft-1',
        eventId: 'event-draft-2024',
        roundNumber: 1,
        teamAId: 'team-alpha',
        teamBId: 'team-beta',
        moderatorId: createdModerators[0].id,
        room: 'Room A1',
        scheduledTime: new Date('2024-03-15T09:00:00Z'),
        status: 'draft',
      },
      {
        id: 'match-draft-2',
        eventId: 'event-draft-2024',
        roundNumber: 1,
        teamAId: 'team-gamma',
        teamBId: 'team-delta',
        moderatorId: createdModerators[1].id,
        room: 'Room A2',
        scheduledTime: new Date('2024-03-15T09:00:00Z'),
        status: 'draft',
      },
      {
        id: 'match-draft-3',
        eventId: 'event-draft-2024',
        roundNumber: 1,
        teamAId: 'team-epsilon',
        teamBId: 'team-zeta',
        moderatorId: createdModerators[2].id,
        room: 'Room A3',
        scheduledTime: new Date('2024-03-15T09:00:00Z'),
        status: 'draft',
      },
      // Active matches for Spring Ethics Challenge with various statuses
      {
        id: 'match-moderator-period-1',
        eventId: 'event-active-spring',
        roundNumber: 1,
        teamAId: 'spring-warriors',
        teamBId: 'ethics-pioneers',
        moderatorId: createdModerators[0].id,
        room: 'Room B1',
        scheduledTime: new Date('2024-01-20T10:00:00Z'),
        status: 'moderator_period_1',
      },
      {
        id: 'match-team-a-presentation',
        eventId: 'event-active-spring',
        roundNumber: 1,
        teamAId: 'moral-compass',
        teamBId: 'virtue-squad',
        moderatorId: createdModerators[1].id,
        room: 'Room B2',
        scheduledTime: new Date('2024-01-20T10:00:00Z'),
        status: 'team_a_presentation',
      },
      {
        id: 'match-judge-1-2',
        eventId: 'event-active-spring',
        roundNumber: 2,
        teamAId: 'spring-warriors',
        teamBId: 'moral-compass',
        moderatorId: createdModerators[2].id,
        room: 'Room B3',
        scheduledTime: new Date('2024-01-20T14:00:00Z'),
        status: 'judge_1_2',
      },
      {
        id: 'match-final-scoring',
        eventId: 'event-active-spring',
        roundNumber: 2,
        teamAId: 'ethics-pioneers',
        teamBId: 'virtue-squad',
        moderatorId: createdModerators[3].id,
        room: 'Room B4',
        scheduledTime: new Date('2024-01-20T14:00:00Z'),
        status: 'completed',
        winnerId: 'ethics-pioneers',
      },
      // Completed matches for Fall Tournament
      {
        id: 'match-completed-1',
        eventId: 'event-completed-fall',
        roundNumber: 5,
        teamAId: 'fall-champions',
        teamBId: 'autumn-scholars',
        moderatorId: createdModerators[4].id,
        room: 'Room C1',
        scheduledTime: new Date('2023-11-12T15:00:00Z'),
        status: 'completed',
        winnerId: 'fall-champions',
      },
      // Mini tournament matches - Round 1
      {
        id: 'match-mini-1',
        eventId: 'event-mini-tournament',
        roundNumber: 1,
        teamAId: 'rookie-squad',
        teamBId: 'new-debaters',
        moderatorId: createdModerators[0].id,
        room: 'Room D1',
        scheduledTime: new Date('2024-02-05T10:00:00Z'),
        status: 'team_b_commentary',
      },
      {
        id: 'match-mini-2',
        eventId: 'event-mini-tournament',
        roundNumber: 1,
        teamAId: 'future-philosophers',
        teamBId: 'young-ethicists',
        moderatorId: createdModerators[1].id,
        room: 'Room D2',
        scheduledTime: new Date('2024-02-05T10:00:00Z'),
        status: 'moderator_period_1',
      },
      {
        id: 'match-mini-3',
        eventId: 'event-mini-tournament',
        roundNumber: 1,
        teamAId: 'moral-minds',
        teamBId: 'ethics-explorers',
        moderatorId: createdModerators[2].id,
        room: 'Room D3',
        scheduledTime: new Date('2024-02-05T10:00:00Z'),
        status: 'draft',
      },
      // Mini tournament matches - Round 2
      {
        id: 'match-mini-4',
        eventId: 'event-mini-tournament',
        roundNumber: 2,
        teamAId: 'rookie-squad',
        teamBId: 'future-philosophers',
        moderatorId: createdModerators[3].id,
        room: 'Room D1',
        scheduledTime: new Date('2024-02-05T14:00:00Z'),
        status: 'draft',
      },
      {
        id: 'match-mini-5',
        eventId: 'event-mini-tournament',
        roundNumber: 2,
        teamAId: 'new-debaters',
        teamBId: 'moral-minds',
        moderatorId: createdModerators[4].id,
        room: 'Room D2',
        scheduledTime: new Date('2024-02-05T14:00:00Z'),
        status: 'draft',
      },
      {
        id: 'match-mini-6',
        eventId: 'event-mini-tournament',
        roundNumber: 2,
        teamAId: 'young-ethicists',
        teamBId: 'ethics-explorers',
        moderatorId: createdModerators[0].id,
        room: 'Room D3',
        scheduledTime: new Date('2024-02-05T14:00:00Z'),
        status: 'draft',
      },
    ];

    const createdMatches = [];
    for (const matchData of matchesData) {
      const match = await prisma.match.upsert({
        where: { id: matchData.id },
        update: matchData,
        create: matchData,
      });
      createdMatches.push(match);
      console.log(`✅ Match created/updated: ${match.id} (${match.status})`);
    }

    // Create match assignments (judges assigned to matches)
    const matchAssignmentsData = [
      // Assignments for draft matches
      { matchId: 'match-draft-1', judgeId: createdJudges[0].id },
      { matchId: 'match-draft-1', judgeId: createdJudges[1].id },
      { matchId: 'match-draft-1', judgeId: createdJudges[2].id },
      
      { matchId: 'match-draft-2', judgeId: createdJudges[3].id },
      { matchId: 'match-draft-2', judgeId: createdJudges[4].id },
      { matchId: 'match-draft-2', judgeId: createdJudges[5].id },
      
      { matchId: 'match-draft-3', judgeId: createdJudges[6].id },
      { matchId: 'match-draft-3', judgeId: createdJudges[7].id },
      { matchId: 'match-draft-3', judgeId: createdJudges[8].id },
      
      // Assignments for active matches
      { matchId: 'match-moderator-period-1', judgeId: createdJudges[0].id },
      { matchId: 'match-moderator-period-1', judgeId: createdJudges[1].id },
      { matchId: 'match-moderator-period-1', judgeId: createdJudges[2].id },
      
      { matchId: 'match-team-a-presentation', judgeId: createdJudges[3].id },
      { matchId: 'match-team-a-presentation', judgeId: createdJudges[4].id },
      { matchId: 'match-team-a-presentation', judgeId: createdJudges[5].id },
      
      { matchId: 'match-judge-1-2', judgeId: createdJudges[6].id },
      { matchId: 'match-judge-1-2', judgeId: createdJudges[7].id },
      { matchId: 'match-judge-1-2', judgeId: createdJudges[8].id },
      
      { matchId: 'match-final-scoring', judgeId: createdJudges[0].id },
      { matchId: 'match-final-scoring', judgeId: createdJudges[1].id },
      { matchId: 'match-final-scoring', judgeId: createdJudges[2].id },
      
      // Assignments for completed match
      { matchId: 'match-completed-1', judgeId: createdJudges[3].id },
      { matchId: 'match-completed-1', judgeId: createdJudges[4].id },
      { matchId: 'match-completed-1', judgeId: createdJudges[5].id },
      
      // Assignments for mini tournament
      { matchId: 'match-mini-1', judgeId: createdJudges[6].id },
      { matchId: 'match-mini-1', judgeId: createdJudges[7].id },
      
      { matchId: 'match-mini-2', judgeId: createdJudges[8].id },
      { matchId: 'match-mini-2', judgeId: createdJudges[0].id },
      
      { matchId: 'match-mini-3', judgeId: createdJudges[1].id },
      { matchId: 'match-mini-3', judgeId: createdJudges[2].id },
      
      { matchId: 'match-mini-4', judgeId: createdJudges[3].id },
      { matchId: 'match-mini-4', judgeId: createdJudges[4].id },
      
      { matchId: 'match-mini-5', judgeId: createdJudges[5].id },
      { matchId: 'match-mini-5', judgeId: createdJudges[6].id },
      
      { matchId: 'match-mini-6', judgeId: createdJudges[7].id },
      { matchId: 'match-mini-6', judgeId: createdJudges[8].id },
    ];

    const createdAssignments = [];
    for (const assignmentData of matchAssignmentsData) {
      const assignment = await prisma.matchAssignment.upsert({
        where: {
          matchId_judgeId: {
            matchId: assignmentData.matchId,
            judgeId: assignmentData.judgeId,
          }
        },
        update: assignmentData,
        create: assignmentData,
      });
      createdAssignments.push(assignment);
    }
    console.log(`✅ Match assignments created: ${createdAssignments.length}`);

    // Create sample scores for some matches
    const scoresData = [
      // Scores for completed match
      {
        matchId: 'match-completed-1',
        judgeId: createdJudges[3].id,
        teamId: 'fall-champions',
        criteriaScores: JSON.stringify({ clarity: 22, analysis: 28, engagement: 23 }),
        commentScores: JSON.stringify([18, 19, 20]),
        notes: 'Excellent presentation with strong ethical reasoning',
        isSubmitted: true,
        submittedAt: new Date('2023-11-12T16:00:00Z'),
      },
      {
        matchId: 'match-completed-1',
        judgeId: createdJudges[3].id,
        teamId: 'autumn-scholars',
        criteriaScores: JSON.stringify({ clarity: 20, analysis: 25, engagement: 21 }),
        commentScores: JSON.stringify([16, 17, 18]),
        notes: 'Good arguments but could improve clarity',
        isSubmitted: true,
        submittedAt: new Date('2023-11-12T16:00:00Z'),
      },
      {
        matchId: 'match-completed-1',
        judgeId: createdJudges[4].id,
        teamId: 'fall-champions',
        criteriaScores: JSON.stringify({ clarity: 24, analysis: 27, engagement: 22 }),
        commentScores: JSON.stringify([19, 18, 19]),
        notes: 'Very strong performance overall',
        isSubmitted: true,
        submittedAt: new Date('2023-11-12T16:00:00Z'),
      },
      {
        matchId: 'match-completed-1',
        judgeId: createdJudges[4].id,
        teamId: 'autumn-scholars',
        criteriaScores: JSON.stringify({ clarity: 19, analysis: 24, engagement: 20 }),
        commentScores: JSON.stringify([15, 16, 17]),
        notes: 'Solid performance with room for improvement',
        isSubmitted: true,
        submittedAt: new Date('2023-11-12T16:00:00Z'),
      },
      {
        matchId: 'match-completed-1',
        judgeId: createdJudges[5].id,
        teamId: 'fall-champions',
        criteriaScores: JSON.stringify({ clarity: 23, analysis: 29, engagement: 24 }),
        commentScores: JSON.stringify([20, 19, 20]),
        notes: 'Outstanding ethical analysis and engagement',
        isSubmitted: true,
        submittedAt: new Date('2023-11-12T16:00:00Z'),
      },
      {
        matchId: 'match-completed-1',
        judgeId: createdJudges[5].id,
        teamId: 'autumn-scholars',
        criteriaScores: JSON.stringify({ clarity: 18, analysis: 23, engagement: 19 }),
        commentScores: JSON.stringify([14, 15, 16]),
        notes: 'Good effort but needs more depth in analysis',
        isSubmitted: true,
        submittedAt: new Date('2023-11-12T16:00:00Z'),
      },
      // Some partial scores for active matches
      {
        matchId: 'match-final-scoring',
        judgeId: createdJudges[0].id,
        teamId: 'ethics-pioneers',
        criteriaScores: JSON.stringify({ argumentation: 30, reasoning: 28, response: 25 }),
        commentScores: JSON.stringify([22, 20, 21, 19]),
        notes: 'Strong performance in final round',
        isSubmitted: true,
        submittedAt: new Date('2024-01-20T15:30:00Z'),
      },
      {
        matchId: 'match-final-scoring',
        judgeId: createdJudges[0].id,
        teamId: 'virtue-squad',
        criteriaScores: JSON.stringify({ argumentation: 28, reasoning: 26, response: 23 }),
        commentScores: JSON.stringify([20, 18, 19, 17]),
        notes: 'Good performance but could improve reasoning',
        isSubmitted: true,
        submittedAt: new Date('2024-01-20T15:30:00Z'),
      },
      {
        matchId: 'match-final-scoring',
        judgeId: createdJudges[1].id,
        teamId: 'ethics-pioneers',
        criteriaScores: JSON.stringify({ argumentation: 29, reasoning: 27, response: 24 }),
        commentScores: JSON.stringify([21, 19, 20, 18]),
        notes: 'Excellent analysis and reasoning',
        isSubmitted: true,
        submittedAt: new Date('2024-01-20T15:35:00Z'),
      },
      {
        matchId: 'match-final-scoring',
        judgeId: createdJudges[1].id,
        teamId: 'virtue-squad',
        criteriaScores: JSON.stringify({ argumentation: 27, reasoning: 25, response: 22 }),
        commentScores: JSON.stringify([19, 17, 18, 16]),
        notes: 'Good effort with clear presentation',
        isSubmitted: true,
        submittedAt: new Date('2024-01-20T15:35:00Z'),
      },
      {
        matchId: 'match-final-scoring',
        judgeId: createdJudges[2].id,
        teamId: 'ethics-pioneers',
        criteriaScores: JSON.stringify({ argumentation: 31, reasoning: 29, response: 26 }),
        commentScores: JSON.stringify([23, 21, 22, 20]),
        notes: 'Outstanding performance throughout',
        isSubmitted: true,
        submittedAt: new Date('2024-01-20T15:40:00Z'),
      },
      {
        matchId: 'match-final-scoring',
        judgeId: createdJudges[2].id,
        teamId: 'virtue-squad',
        criteriaScores: JSON.stringify({ argumentation: 26, reasoning: 24, response: 21 }),
        commentScores: JSON.stringify([18, 16, 17, 15]),
        notes: 'Solid performance but needs more depth',
        isSubmitted: true,
        submittedAt: new Date('2024-01-20T15:40:00Z'),
      },
      
      // Scores for judge_1_2 match (partial scoring during active match)
      {
        matchId: 'match-judge-1-2',
        judgeId: createdJudges[6].id,
        teamId: 'team-alpha',
        criteriaScores: JSON.stringify({ clarity: 24, analysis: 26, engagement: 23 }),
        commentScores: JSON.stringify([20, 18]),
        notes: 'Strong start, waiting for final questions',
        isSubmitted: false,
      },
      {
        matchId: 'match-judge-1-2',
        judgeId: createdJudges[6].id,
        teamId: 'team-beta',
        criteriaScores: JSON.stringify({ clarity: 22, analysis: 24, engagement: 21 }),
        commentScores: JSON.stringify([19, 17]),
        notes: 'Good presentation, needs stronger analysis',
        isSubmitted: false,
      },
      {
        matchId: 'match-judge-1-2',
        judgeId: createdJudges[7].id,
        teamId: 'team-alpha',
        criteriaScores: JSON.stringify({ clarity: 23, analysis: 25, engagement: 22 }),
        commentScores: JSON.stringify([19, 17]),
        notes: 'Clear arguments, good engagement',
        isSubmitted: false,
      },
      {
        matchId: 'match-judge-1-2',
        judgeId: createdJudges[7].id,
        teamId: 'team-beta',
        criteriaScores: JSON.stringify({ clarity: 21, analysis: 23, engagement: 20 }),
        commentScores: JSON.stringify([18, 16]),
        notes: 'Decent performance, room for improvement',
        isSubmitted: false,
      },
      
      // Scores for team_a_presentation match (early stage scoring)
      {
        matchId: 'match-team-a-presentation',
        judgeId: createdJudges[3].id,
        teamId: 'team-gamma',
        criteriaScores: JSON.stringify({ clarity: 25, analysis: 27, engagement: 24 }),
        commentScores: JSON.stringify([21]),
        notes: 'Excellent opening presentation',
        isSubmitted: false,
      },
      {
        matchId: 'match-team-a-presentation',
        judgeId: createdJudges[4].id,
        teamId: 'team-gamma',
        criteriaScores: JSON.stringify({ clarity: 24, analysis: 26, engagement: 23 }),
        commentScores: JSON.stringify([20]),
        notes: 'Very strong initial case',
        isSubmitted: false,
      },
      
      // Additional scores for Mini Tournament matches
      {
        matchId: 'match-mini-1',
        judgeId: createdJudges[0].id,
        teamId: 'future-philosophers',
        criteriaScores: JSON.stringify({ clarity: 20, analysis: 22, engagement: 19 }),
        commentScores: JSON.stringify([17, 16]),
        notes: 'Good high school level performance',
        isSubmitted: false,
      },
      {
        matchId: 'match-mini-1',
        judgeId: createdJudges[0].id,
        teamId: 'young-ethicists',
        criteriaScores: JSON.stringify({ clarity: 19, analysis: 21, engagement: 18 }),
        commentScores: JSON.stringify([16, 15]),
        notes: 'Promising start for young team',
        isSubmitted: false,
      },
      {
        matchId: 'match-mini-1',
        judgeId: createdJudges[1].id,
        teamId: 'future-philosophers',
        criteriaScores: JSON.stringify({ clarity: 21, analysis: 23, engagement: 20 }),
        commentScores: JSON.stringify([18, 17]),
        notes: 'Impressive reasoning for high school students',
        isSubmitted: false,
      },
      {
        matchId: 'match-mini-1',
        judgeId: createdJudges[1].id,
        teamId: 'young-ethicists',
        criteriaScores: JSON.stringify({ clarity: 18, analysis: 20, engagement: 17 }),
        commentScores: JSON.stringify([15, 14]),
        notes: 'Good effort, needs more practice',
        isSubmitted: false,
      },
      
      // Scores for moderator_period_1 match (early scoring by proactive judges)
      {
        matchId: 'match-moderator-period-1',
        judgeId: createdJudges[2].id,
        teamId: 'team-epsilon',
        criteriaScores: JSON.stringify({ clarity: 0, analysis: 0, engagement: 0 }),
        commentScores: JSON.stringify([]),
        notes: 'Initial score sheet - match just started',
        isSubmitted: false,
      },
      {
        matchId: 'match-moderator-period-1',
        judgeId: createdJudges[2].id,
        teamId: 'team-zeta',
        criteriaScores: JSON.stringify({ clarity: 0, analysis: 0, engagement: 0 }),
        commentScores: JSON.stringify([]),
        notes: 'Initial score sheet - match just started',
        isSubmitted: false,
      },
    ];

    const createdScores = [];
    for (const scoreData of scoresData) {
      const score = await prisma.score.upsert({
        where: {
          matchId_judgeId_teamId: {
            matchId: scoreData.matchId,
            judgeId: scoreData.judgeId,
            teamId: scoreData.teamId,
          }
        },
        update: scoreData,
        create: scoreData,
      });
      createdScores.push(score);
    }
    console.log(`✅ Scores created: ${createdScores.length}`);

    // Create sample pre-approved emails
    const preApprovedEmailsData = [
      {
        email: 'newjudge@university.edu',
        role: 'judge',
        notes: 'Pre-approved ethics professor from University',
      },
      {
        email: 'moderator@college.edu',
        role: 'moderator',
        notes: 'Experienced debate moderator',
      },
      {
        email: 'admin@school.edu',
        role: 'admin',
        notes: 'School administrator with ethics background',
      },
      {
        email: 'teacher1@highschool.edu',
        role: 'judge',
        notes: 'High school ethics teacher',
      },
      {
        email: 'professor@institute.edu',
        role: 'judge',
        notes: 'Philosophy professor specializing in ethics',
      },
    ];

    for (const preApprovedData of preApprovedEmailsData) {
      const preApprovedEmail = await prisma.preApprovedEmail.upsert({
        where: { email: preApprovedData.email },
        update: {
          role: preApprovedData.role,
          notes: preApprovedData.notes,
        },
        create: {
          email: preApprovedData.email,
          role: preApprovedData.role,
          notes: preApprovedData.notes,
          createdBy: adminUser.id,
        },
      });
      console.log(`✅ Pre-approved email created/updated: ${preApprovedEmail.email} (${preApprovedEmail.role})`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👤 Admin user: ${adminUser.email} (isActive: ${adminUser.isActive})`);
    console.log(`👨‍⚖️ Judges created: ${createdJudges.length}`);
    console.log(`🎯 Moderators created: ${createdModerators.length}`);
    console.log(`📅 Events created: ${createdEvents.length}`);
    console.log(`   - Draft events: ${createdEvents.filter(e => e.status === 'draft').length}`);
    console.log(`   - Active events: ${createdEvents.filter(e => e.status === 'active').length}`);
    console.log(`   - Completed events: ${createdEvents.filter(e => e.status === 'completed').length}`);
    console.log(`🏆 Teams created: ${createdTeams.length}`);
    console.log(`🥊 Matches created: ${createdMatches.length}`);
    console.log(`   - Draft matches: ${createdMatches.filter(m => m.status === 'draft').length}`);
    console.log(`   - Active matches: ${createdMatches.filter(m => m.status !== 'draft' && m.status !== 'completed').length}`);
    console.log(`   - Completed matches: ${createdMatches.filter(m => m.status === 'completed').length}`);
    console.log(`👨‍⚖️ Match assignments: ${createdAssignments.length}`);
    console.log(`📊 Scores created: ${createdScores.length}`);
    console.log(`📧 Pre-approved emails created: ${preApprovedEmailsData.length}`);
    
    console.log('\n🔄 Match Status Examples:');
    console.log(`   - draft: Basic matches ready to start`);
    console.log(`   - moderator_period_1: Match started, moderator introducing`);
    console.log(`   - team_a_presentation: Team A presenting their case`);
    console.log(`   - judge_1_2: Judge asking second question in period 1`);
    console.log(`   - team_b_commentary: Team B providing commentary`);
    console.log(`   - final_scoring: All rounds complete, final scoring`);
    console.log(`   - completed: Match finished with winner selected`);
    
    console.log('\n👥 Total active users:');
    console.log(`   - 1 Admin: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   - ${createdJudges.length} Judges: ${createdJudges.slice(0, 3).map(j => j.firstName + ' ' + j.lastName).join(', ')}...`);
    console.log(`   - ${createdModerators.length} Moderators: ${createdModerators.slice(0, 3).map(m => m.firstName + ' ' + m.lastName).join(', ')}...`);
    
    console.log('\n🚀 You can now test the new match status system!');
    console.log('📝 Features to test:');
    console.log('   - Start matches from draft to moderator_period_1');
    console.log('   - Advance matches through various status phases');
    console.log('   - Judges can score from moderator_period_1 onwards');
    console.log('   - Complete matches only when all judges submit scores');
    console.log('   - View different status displays and colors');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 