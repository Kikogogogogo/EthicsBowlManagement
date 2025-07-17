Notes on the Standings for Ethics Bowl Tournaments
The administrators should be able to view both match results and team standings for
the tournament. The standings should be updated as new information comes in (i.e.,
matches get completed). All teams begin tied in the standings.
The standings are determined by the following factors, in order of importance: result
(wins), votes, and score differential. What this means is that if Team A has a higher
results (wins) total than Team B, Team A should always be ranked higher than Team B.
If the teams are tied in wins, then the team with more votes is always ranked higher. If
they are tied in wins and votes, then the team with the higher score differential total
should always be ranked higher.
• Result (Wins): teams with more wins are ranked higher than those with fewer
wins. Winning a match is worth one win for the winning team and zero wins for
the losing team.
A team wins a match when they receive more votes than the other team. The
match is tied when both teams receive the same number of votes. If the match is
a tie, that is worth .5 of a win for each team.
• Votes: if two teams are tied in wins, the team with more cumulative votes is
ranked higher than the team with fewer. A team can receive between zero and
three votes per match. Each judge gets one vote, including the simulated ‘third
judge’ in a two-judge match (see note below).
A judge’s vote is determined by the scores they assign to each team in the
match—it is a not a separate decision the judge gets to make. The judge counts as
voting for a team if and only if they assign that team a higher score than the
other team. For example, if judge Kiko gives Team A 50 points overall and Team
B zero points, that counts as a single vote for Team A. If they give Team A 30
points and Team B 29 points, that also counts as a single vote for team A (the
score differential does not affect the vote, only which point total is higher).
If a judge gives an equal number of points to each team, that counts as .5 of a vote
for each team.
• Score differential: a team’s score differential is the cumulative sum of the
differences between their scores and those of their opponents. It can be a positive
or a negative number. If two teams are tied in wins and votes, the team with the
higher score differential will be ranked higher.
For example, suppose Team A and Team B play each other in two matches, and
the judges score them as displayed in the table below. The rightmost column
shows that team’s score differential for that match.
2
Match Judge 1 Judge 2 Judge 3 Score
differential
Team A 1 50 45 40 5
Team B 1 45 40 45 -5
Team A 2 55 40 35 40
Team B 2 35 30 25 -40
If these are the only two matches for these two teams, their total score
differentials will be the sums of their score differentials in each match. I.e., Team
A’s total score differential will be +45 and Team B’s will be -45.
Match results
The match results displays the results of each match in the tournament (once the match
is complete). It should display the following information for each match:
• Which teams played
• Which team won, or if the match was a tie
• How many votes each team received
• What each team’s score differential was for the match
• Whether the match used two judge protocol
Two Judge Protocol
Ensuring fairness throughout the tournament requires that we assume that there are
three judges for each match. However, some matches will only have two judges. This
creates a problem, since we don’t want teams in two-judge matches to be
disadvantaged. In these cases, we use a two judge protocol, which is a method for
simulating a third judge in a match where there are only two judges.
The way two judge protocol works is straightforward: the third judge is simulated, and
their score for each team is simply the mean of the two real judges’ scores. So for
example, if judge 1 gives Team A 40 points and Judge 2 gives them 30 points, the
simulated judge 3 will give team A 35 points.
Otherwise, the scoring of the match works the same as with three real judges. The
simulated third judge gets one vote, just like a real judge would, and it goes to
whichever team they assign the higher score.
3
Semi-finals and Finals
Tournaments will often have some number of semi-final and final rounds. These work
differently from the rest of the tournament, where the standings are based on
cumulative performance. These rounds are sudden death elimination, meaning that the
winner will proceed to the next round and the loser is eliminated, regardless of their
respective histories in the tournament so far.