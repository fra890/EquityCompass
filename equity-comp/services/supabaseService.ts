import { supabase } from '../supabaseClient';
import { Client, Grant, PlannedExercise, StockSale } from '../types';

interface DbClient {
  id: string;
  user_id: string;
  name: string;
  state: string;
  filing_status: 'single' | 'married_joint';
  tax_bracket: number;
  estimated_income?: number;
  custom_state_tax_rate?: number;
  custom_ltcg_tax_rate?: number;
  custom_amt_safe_harbor?: number;
  created_at: string;
  updated_at: string;
}

interface DbGrant {
  id: string;
  client_id: string;
  type: 'RSU' | 'ISO';
  ticker: string;
  company_name: string;
  current_price: number;
  grant_price?: number;
  strike_price?: number;
  grant_date: string;
  total_shares: number;
  vesting_schedule: string;
  withholding_rate?: number;
  custom_held_shares?: number;
  average_cost_basis?: number;
  plan_notes?: string;
  created_at: string;
  updated_at: string;
}

interface DbStockSale {
  id: string;
  grant_id: string;
  client_id: string;
  sale_date: string;
  shares_sold: number;
  sale_price: number;
  total_proceeds: number;
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface DbPlannedExercise {
  id: string;
  client_id: string;
  grant_id: string;
  grant_ticker: string;
  shares: number;
  exercise_date: string;
  exercise_price: number;
  fmv_at_exercise: number;
  type: string;
  amt_exposure: number;
  estimated_cost: number;
  created_at: string;
  updated_at: string;
}

function dbStockSaleToStockSale(dbSale: DbStockSale): StockSale {
  return {
    id: dbSale.id,
    grantId: dbSale.grant_id,
    saleDate: dbSale.sale_date,
    sharesSold: dbSale.shares_sold,
    salePrice: dbSale.sale_price,
    totalProceeds: dbSale.total_proceeds,
    reason: dbSale.reason,
    notes: dbSale.notes,
    createdAt: dbSale.created_at,
  };
}

function dbGrantToGrant(dbGrant: DbGrant, sales: StockSale[] = []): Grant {
  return {
    id: dbGrant.id,
    type: dbGrant.type,
    ticker: dbGrant.ticker,
    companyName: dbGrant.company_name,
    currentPrice: dbGrant.current_price,
    grantPrice: dbGrant.grant_price,
    strikePrice: dbGrant.strike_price,
    grantDate: dbGrant.grant_date,
    totalShares: dbGrant.total_shares,
    vestingSchedule: dbGrant.vesting_schedule as any,
    withholdingRate: dbGrant.withholding_rate,
    customHeldShares: dbGrant.custom_held_shares,
    averageCostBasis: dbGrant.average_cost_basis,
    planNotes: dbGrant.plan_notes,
    sales: sales,
    lastUpdated: dbGrant.updated_at,
  };
}

function dbPlannedExerciseToPlannedExercise(dbExercise: DbPlannedExercise): PlannedExercise {
  return {
    id: dbExercise.id,
    grantId: dbExercise.grant_id,
    grantTicker: dbExercise.grant_ticker,
    shares: dbExercise.shares,
    exerciseDate: dbExercise.exercise_date,
    exercisePrice: dbExercise.exercise_price,
    fmvAtExercise: dbExercise.fmv_at_exercise,
    type: 'ISO',
    amtExposure: dbExercise.amt_exposure,
    estimatedCost: dbExercise.estimated_cost,
  };
}

export const getClients = async (userId: string): Promise<Client[]> => {
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    throw clientsError;
  }

  if (!clientsData || clientsData.length === 0) {
    return [];
  }

  const clientIds = clientsData.map(c => c.id);

  const { data: grantsData, error: grantsError } = await supabase
    .from('grants')
    .select('*')
    .in('client_id', clientIds);

  if (grantsError) {
    console.error('Error fetching grants:', grantsError);
    throw grantsError;
  }

  const { data: exercisesData, error: exercisesError } = await supabase
    .from('planned_exercises')
    .select('*')
    .in('client_id', clientIds);

  if (exercisesError) {
    console.error('Error fetching planned exercises:', exercisesError);
    throw exercisesError;
  }

  const { data: salesData, error: salesError } = await supabase
    .from('stock_sales')
    .select('*')
    .in('client_id', clientIds)
    .order('sale_date', { ascending: false });

  if (salesError) {
    console.error('Error fetching stock sales:', salesError);
    throw salesError;
  }

  const clients: Client[] = clientsData.map((dbClient: DbClient) => {
    const clientGrants = (grantsData || [])
      .filter((g: DbGrant) => g.client_id === dbClient.id)
      .map((grant: DbGrant) => {
        const grantSales = (salesData || [])
          .filter((s: DbStockSale) => s.grant_id === grant.id)
          .map(dbStockSaleToStockSale);
        return dbGrantToGrant(grant, grantSales);
      });

    const clientExercises = (exercisesData || [])
      .filter((e: DbPlannedExercise) => e.client_id === dbClient.id)
      .map(dbPlannedExerciseToPlannedExercise);

    return {
      id: dbClient.id,
      name: dbClient.name,
      state: dbClient.state,
      filingStatus: dbClient.filing_status,
      taxBracket: dbClient.tax_bracket,
      estimatedIncome: dbClient.estimated_income,
      customStateTaxRate: dbClient.custom_state_tax_rate,
      customLtcgTaxRate: dbClient.custom_ltcg_tax_rate,
      customAmtSafeHarbor: dbClient.custom_amt_safe_harbor,
      grants: clientGrants,
      plannedExercises: clientExercises,
    };
  });

  return clients;
};

export const saveClient = async (userId: string, client: Client): Promise<void> => {
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('id', client.id)
    .maybeSingle();

  const clientData = {
    user_id: userId,
    name: client.name,
    state: client.state,
    filing_status: client.filingStatus,
    tax_bracket: client.taxBracket,
    estimated_income: client.estimatedIncome || 0,
    custom_state_tax_rate: client.customStateTaxRate,
    custom_ltcg_tax_rate: client.customLtcgTaxRate,
    custom_amt_safe_harbor: client.customAmtSafeHarbor,
  };

  if (existingClient) {
    const { error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', client.id);

    if (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  } else {
    const { error } = await supabase
      .from('clients')
      .insert({ ...clientData, id: client.id });

    if (error) {
      console.error('Error inserting client:', error);
      throw error;
    }
  }

  const { data: existingGrants } = await supabase
    .from('grants')
    .select('id')
    .eq('client_id', client.id);

  const existingGrantIds = new Set((existingGrants || []).map(g => g.id));
  const currentGrantIds = new Set(client.grants.map(g => g.id));

  const grantsToDelete = [...existingGrantIds].filter(id => !currentGrantIds.has(id));
  if (grantsToDelete.length > 0) {
    await supabase
      .from('grants')
      .delete()
      .in('id', grantsToDelete);
  }

  for (const grant of client.grants) {
    const grantData = {
      client_id: client.id,
      type: grant.type,
      ticker: grant.ticker,
      company_name: grant.companyName,
      current_price: grant.currentPrice,
      grant_price: grant.grantPrice,
      strike_price: grant.strikePrice,
      grant_date: grant.grantDate,
      total_shares: grant.totalShares,
      vesting_schedule: grant.vestingSchedule,
      withholding_rate: grant.withholdingRate,
      custom_held_shares: grant.customHeldShares,
      average_cost_basis: grant.averageCostBasis,
      plan_notes: grant.planNotes,
    };

    if (existingGrantIds.has(grant.id)) {
      await supabase
        .from('grants')
        .update(grantData)
        .eq('id', grant.id);
    } else {
      await supabase
        .from('grants')
        .insert({ ...grantData, id: grant.id });
    }
  }

  const { data: existingExercises } = await supabase
    .from('planned_exercises')
    .select('id')
    .eq('client_id', client.id);

  const existingExerciseIds = new Set((existingExercises || []).map(e => e.id));
  const currentExerciseIds = new Set(client.plannedExercises.map(e => e.id));

  const exercisesToDelete = [...existingExerciseIds].filter(id => !currentExerciseIds.has(id));
  if (exercisesToDelete.length > 0) {
    await supabase
      .from('planned_exercises')
      .delete()
      .in('id', exercisesToDelete);
  }

  for (const exercise of client.plannedExercises) {
    const exerciseData = {
      client_id: client.id,
      grant_id: exercise.grantId,
      grant_ticker: exercise.grantTicker,
      shares: exercise.shares,
      exercise_date: exercise.exerciseDate,
      exercise_price: exercise.exercisePrice,
      fmv_at_exercise: exercise.fmvAtExercise,
      type: exercise.type,
      amt_exposure: exercise.amtExposure,
      estimated_cost: exercise.estimatedCost,
    };

    if (existingExerciseIds.has(exercise.id)) {
      await supabase
        .from('planned_exercises')
        .update(exerciseData)
        .eq('id', exercise.id);
    } else {
      await supabase
        .from('planned_exercises')
        .insert({ ...exerciseData, id: exercise.id });
    }
  }
};

export const deleteClient = async (userId: string, clientId: string): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

export const createStockSale = async (sale: Omit<StockSale, 'id' | 'createdAt'>, clientId: string): Promise<StockSale> => {
  const saleData = {
    grant_id: sale.grantId,
    client_id: clientId,
    sale_date: sale.saleDate,
    shares_sold: sale.sharesSold,
    sale_price: sale.salePrice,
    total_proceeds: sale.totalProceeds,
    reason: sale.reason,
    notes: sale.notes,
  };

  const { data, error } = await supabase
    .from('stock_sales')
    .insert(saleData)
    .select()
    .single();

  if (error) {
    console.error('Error creating stock sale:', error);
    throw error;
  }

  return dbStockSaleToStockSale(data);
};

export const updateStockSale = async (saleId: string, updates: Partial<Omit<StockSale, 'id' | 'grantId' | 'createdAt'>>): Promise<StockSale> => {
  const updateData: any = {};

  if (updates.saleDate) updateData.sale_date = updates.saleDate;
  if (updates.sharesSold !== undefined) updateData.shares_sold = updates.sharesSold;
  if (updates.salePrice !== undefined) updateData.sale_price = updates.salePrice;
  if (updates.totalProceeds !== undefined) updateData.total_proceeds = updates.totalProceeds;
  if (updates.reason) updateData.reason = updates.reason;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { data, error } = await supabase
    .from('stock_sales')
    .update(updateData)
    .eq('id', saleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating stock sale:', error);
    throw error;
  }

  return dbStockSaleToStockSale(data);
};

export const deleteStockSale = async (saleId: string): Promise<void> => {
  const { error } = await supabase
    .from('stock_sales')
    .delete()
    .eq('id', saleId);

  if (error) {
    console.error('Error deleting stock sale:', error);
    throw error;
  }
};
