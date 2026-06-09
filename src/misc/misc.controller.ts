import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import { DbService } from '../db/db.service';
import { UserId } from '../common/user-id.decorator';
import { SEASON } from '../db/seed';

class VoteDto { @IsString() optionId: string; }

@Controller()
export class MiscController {
  constructor(private readonly db: DbService) {}

  @Get('ranking')
  ranking(@Query('season') season?: string) {
    const s = season || SEASON;
    const ranking = this.db.all(`SELECT handle, points, is_me FROM point WHERE season=? ORDER BY points DESC`, [s])
      .map((r, i) => ({ rank: i + 1, handle: r.handle, points: r.points, isMe: !!r.is_me }));
    return { season: s, ranking };
  }

  @Get('governance')
  governance() {
    const opts = this.db.all(`SELECT id, proposal_id, label, votes FROM gov_option ORDER BY rowid`);
    const proposalId = opts.length ? opts[0].proposal_id : null;
    return {
      proposalId,
      title: '次に組成するファンドを投票で決定',
      options: opts.map((o) => ({ id: o.id, label: o.label, votes: o.votes })),
    };
  }

  @Post('governance/vote')
  vote(@Body() dto: VoteDto, @UserId() userId: string) {
    const opt = this.db.get(`SELECT id, proposal_id, label, votes FROM gov_option WHERE id=?`, [dto.optionId]);
    if (!opt) return { ok: false, error: '不明な選択肢' };
    const already = this.db.get(`SELECT 1 FROM gov_vote WHERE proposal_id=? AND user_id=?`, [opt.proposal_id, userId]);
    if (already) return { ok: false, error: '既に投票済みです', proposalId: opt.proposal_id };
    this.db.run(`UPDATE gov_option SET votes=votes+1 WHERE id=?`, [dto.optionId]);
    this.db.run(`INSERT INTO gov_vote(proposal_id,user_id,option_id,created_at) VALUES(?,?,?,?)`,
      [opt.proposal_id, userId, dto.optionId, new Date().toISOString()]);
    this.db.save();
    return { ok: true, proposalId: opt.proposal_id, voted: { id: opt.id, label: opt.label, votes: opt.votes + 1 } };
  }
}
