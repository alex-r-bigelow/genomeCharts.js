headers = ['chrom','start','stop','name']

# Only stuff in this range will be included in the output
CHROM = 'chr2'
LOW = 201566128
HIGH = 202566128

infile = open('../refGene_hg19.gff3','rb')
outfile = open('genes.json','w')

exonParents = {}
genes = {}

for line in infile:
    if line[0] == '#' or len(line.strip()) <= 1:
        continue
    temp = line.split()
    if temp[0] == CHROM:
        start = int(temp[3])
        stop = int(temp[4])
        if start > HIGH or stop < LOW:
            continue
        attrs = dict(item.split('=') for item in temp[8].split(';'))
        
        if temp[2] == 'exon' or temp[2] == 'CDS':
            if not exonParents.has_key(attrs['Parent']):
                exonParents[attrs['Parent']] = {'gene':None,'exons':[]}
            exonParents[attrs['Parent']]['exons'].append((start,stop))
        elif temp[2] == 'gene':
            genes[attrs['ID']] = {'endPoint':None,'exons':[],'direction':temp[6]}
        elif temp[2] == 'mRNA' or temp[2] == 'ncRNA':
            if not exonParents.has_key(attrs['ID']):
                exonParents[attrs['ID']] = {'gene':None,'exons':[]}
            exonParents[attrs['ID']]['gene'] = attrs['Parent']
        else:
            raise Exception('Unknown type: ' + temp[2])

for parentObj in exonParents.itervalues():
    geneID = parentObj['gene']
    exons = parentObj['exons']
    if not genes.has_key(geneID):
        raise Exception('Unknown gene: ' + geneID)
    genes[geneID]['exons'].extend(exons)
    genes[geneID]['exons'].sort(key=lambda x: x[0]) # sort the exons themselves by first position
    genes[geneID]['endPoint'] = max(genes[geneID]['exons'], key=lambda x:x[1])[1]   # extract out the end point of the last exon

geneOrder = [g[0] for g in sorted(genes.iteritems(), key=lambda x: x[1]['endPoint'])]   # sorted list of the geneIDs by their endPoint

outfile.write('[\n')
firstname = True
for geneID in geneOrder:
    if '_DUP_' in geneID:
        continue
    if not firstname:
        outfile.write(',\n')
    else:
        firstname = False
    outfile.write('\t{\n\t\t"name" : "' + geneID + '",\n\t\t"direction" : "' + genes[geneID]['direction'] + '",\n\t\t"exons" : [\n')
    exons = genes[geneID]['exons']
    firstSpan = True
    firstStart = None
    lastStop = None
    for (start, stop) in exons:
        if firstStart == None or start < firstStart:
            firstStart = start
        if lastStop == None or stop > lastStop:
            lastStop = stop
        if not firstSpan:
            outfile.write(',\n')
        else:
            firstSpan = False
        outfile.write('\t\t\t{ "start" : ' + str(start) + ', "stop" : ' + str(stop) + ' }')
    outfile.write('\n\t\t],\n\t\t"start" : ' + str(firstStart) + ',\n\t\t"stop" : ' + str(lastStop) + '\n\t}')
outfile.write('\n]')
infile.close()
outfile.close()