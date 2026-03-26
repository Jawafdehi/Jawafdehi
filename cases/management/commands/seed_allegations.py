from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import connection
from datetime import datetime


class Command(BaseCommand):
    help = "Seed example cases data"

    def handle(self, *args, **options):
        from cases.models import (
            Case,
            CaseEntityRelationship,
            CaseType,
            CaseState,
            DocumentSource,
            JawafEntity,
            RelationshipType,
        )

        db_settings = connection.settings_dict
        self.stdout.write(
            self.style.WARNING(
                "WARNING: This will delete all existing cases and document sources!"
            )
        )
        self.stdout.write(f'Database: {db_settings["NAME"]}')
        self.stdout.write(f'Host: {db_settings.get("HOST", "localhost")}')
        confirm = input('Type "yes" to continue: ')

        if confirm.lower() != "yes":
            self.stdout.write(self.style.ERROR("Aborted."))
            return

        Case.objects.all().delete()
        DocumentSource.objects.all().delete()

        self.stdout.write("Creating entities...")

        # Helper function to get or create entities
        def get_entity(nes_id):
            entity, _ = JawafEntity.objects.get_or_create(nes_id=nes_id)
            return entity

        def set_case_entities(
            case, alleged_ids=None, related_ids=None, location_ids=None
        ):
            alleged_ids = alleged_ids or []
            related_ids = related_ids or []
            location_ids = location_ids or []

            for nes_id in alleged_ids:
                CaseEntityRelationship.objects.get_or_create(
                    case=case,
                    entity=get_entity(nes_id),
                    relationship_type=RelationshipType.ALLEGED,
                    defaults={"notes": ""},
                )

            for nes_id in related_ids + location_ids:
                CaseEntityRelationship.objects.get_or_create(
                    case=case,
                    entity=get_entity(nes_id),
                    relationship_type=RelationshipType.RELATED,
                    defaults={"notes": ""},
                )

        self.stdout.write("Creating document sources...")

        # Create document sources
        ciaa_report = DocumentSource.objects.create(
            source_id="source:20180310:ciaa001",
            title="CIAA Investigation Report - Lalita Niwas Land Grab",
            description="Comprehensive investigation report by Commission for Investigation of Abuse of Authority documenting forged land ownership certificates and illegal transfers.",
            url=["https://example.com/ciaa-lalita-niwas-report"],
        )
        ciaa_report.related_entities.set(
            [
                get_entity("entity:person/balakrishna-khand"),
                get_entity("entity:organization/government_body/nepal-government"),
            ]
        )

        court_files = DocumentSource.objects.create(
            source_id="source:20180310:court001",
            title="Supreme Court and District Court Case Files - Lalita Niwas",
            description="Official court documents including case filings, hearings, and rulings related to the Lalita Niwas land grab case.",
            url=["https://example.com/court-lalita-niwas"],
        )
        court_files.related_entities.set(
            [
                get_entity("entity:organization/government_body/nepal-government"),
            ]
        )

        coop_complaint = DocumentSource.objects.create(
            source_id="source:20230520:coop001",
            title="Police Complaint - Cooperative Fraud",
            description="Official police complaint filed by victims of Suryadarshan Cooperative alleging embezzlement of funds.",
            url=["https://example.com/cooperative-complaint"],
        )
        coop_complaint.related_entities.set(
            [
                get_entity("entity:person/rabi-lamichhane"),
            ]
        )

        coop_testimony = DocumentSource.objects.create(
            source_id="source:20230520:testimony001",
            title="Cooperative Victims' Testimonies and Financial Records",
            description="Collection of victim testimonies and financial records showing fund transfers and misappropriation.",
        )
        coop_testimony.related_entities.set(
            [
                get_entity("entity:person/rabi-lamichhane"),
            ]
        )

        audit_report = DocumentSource.objects.create(
            source_id="source:20200101:audit001",
            title="Government Audit Report - Melamchi Project Cost Escalations",
            description="Official audit reports documenting cost overruns and delays in the Melamchi Water Supply Project.",
            url=["https://example.com/melamchi-audit"],
        )
        audit_report.related_entities.set(
            [
                get_entity(
                    "entity:organization/government_body/melamchi-water-supply-board"
                ),
            ]
        )

        DocumentSource.objects.create(
            source_id="source:20200101:media001",
            title="News Reports - Melamchi Project Delays",
            description="Compilation of news articles documenting repeated delays and failures in the Melamchi project over two decades.",
        )

        campaign_videos = DocumentSource.objects.create(
            source_id="source:20210715:campaign001",
            title="KP Oli Election Campaign Speeches 2017",
            description="Video recordings of election campaign speeches where promises were made regarding prosperity, railways, and employment.",
            url=["https://example.com/oli-campaign-2017"],
        )
        campaign_videos.related_entities.set(
            [
                get_entity("entity:person/kp-sharma-oli"),
            ]
        )

        DocumentSource.objects.create(
            source_id="source:20210715:economic001",
            title="Economic Data 2017-2021 - Nepal",
            description="Economic indicators and development data showing lack of promised progress during KP Oli's tenure.",
        )

        media_coverage = DocumentSource.objects.create(
            source_id="source:20220910:media001",
            title="Media Coverage Analysis - Sandeep Lamichhane Case",
            description="Collection of news articles with prejudicial language published during the Sandeep Lamichhane case proceedings.",
        )
        media_coverage.related_entities.set(
            [
                get_entity("entity:person/sandeep-lamichhane"),
            ]
        )

        DocumentSource.objects.create(
            source_id="source:20220910:ethics001",
            title="Media Ethics Analysis - Trial by Media",
            description="Analysis by media ethics organizations examining the impact of media coverage on fair trial rights.",
        )

        self.stdout.write("Creating cases...")

        # 1. Lalita Niwas
        lalita = Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Lalita Niwas Land Grab Scandal",
            description="""<h1>Lalita Niwas Land Grab Case</h1>

<h2>Overview</h2>
<p>The Lalita Niwas land grab case involves the illegal transfer of approximately 175 ropanis of government land in Baluwatar, Kathmandu. The land, originally part of the Lalita Niwas palace complex, was fraudulently registered in the names of various individuals through forged documents.</p>

<h2>Key Details</h2>
<ul>
<li><strong>Land Area</strong>: 175 ropanis (approximately 8.9 hectares)</li>
<li><strong>Location</strong>: Baluwatar, Kathmandu</li>
<li><strong>Estimated Value</strong>: Over NPR 3 billion</li>
<li><strong>Method</strong>: Forged documents and illegal land registration</li>
</ul>

<h2>Allegations</h2>
<p>Multiple government officials, including former ministers and land revenue officers, are accused of facilitating the illegal transfer through document forgery and abuse of authority.</p>""",
            key_allegations=[
                "Illegal transfer of 175 ropanis of government land through forged documents",
                "Involvement of high-ranking officials in facilitating the transfer",
                "Estimated loss of NPR 3+ billion to state",
            ],
            timeline=[
                {
                    "date": "2018-03-15",
                    "title": "Case filed",
                    "description": "CIAA files case against officials involved in land grab",
                    "order": 1,
                },
                {
                    "date": "2020-07-20",
                    "title": "Supreme Court ruling",
                    "description": "Supreme Court orders investigation into all involved parties",
                    "order": 2,
                },
            ],
            evidence=[
                {
                    "source_id": "source:20180310:ciaa001",
                    "description": "CIAA investigation report documenting forged land ownership certificates",
                    "order": 1,
                },
                {
                    "source_id": "source:20180310:court001",
                    "description": "Supreme Court and District Court case files",
                    "order": 2,
                },
            ],
            case_start_date=datetime(2018, 3, 15).date(),
            created_at=timezone.make_aware(datetime(2018, 3, 10)),
        )
        set_case_entities(
            lalita,
            alleged_ids=[
                "entity:person/balakrishna-khand",
                "entity:person/madhav-prasad-ghimire",
            ],
            related_ids=[
                "entity:organization/government_body/nepal-government",
                "entity:organization/government_body/land-revenue-office-dillibazar",
            ],
            location_ids=["entity:location/district/kathmandu"],
        )

        # 2. Rabi Lamichhane
        rabi = Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Rabi Lamichhane Cooperative Fraud and Citizenship Controversy",
            description="""<h1>Rabi Lamichhane Controversies</h1>

<h2>Overview</h2>
<p>Rabi Lamichhane, president of Rastriya Swatantra Party and former Deputy Prime Minister, faces multiple allegations including cooperative fraud and citizenship irregularities.</p>

<h2>Cooperative Fraud Allegations</h2>
<ul>
<li>Accused of embezzling funds from Suryadarshan Cooperative</li>
<li>Alleged misuse of cooperative funds for personal media business</li>
<li>Multiple cooperative victims filed complaints</li>
</ul>

<h2>Citizenship Controversy</h2>
<ul>
<li>Questions raised about validity of his Nepali citizenship</li>
<li>Allegations of holding US citizenship while serving as minister</li>
<li>Supreme Court ordered investigation into citizenship status</li>
</ul>

<h2>Political Impact</h2>
<p>The allegations led to his resignation as Deputy Prime Minister and Home Minister, and subsequent arrest in the cooperative fraud case.</p>""",
            key_allegations=[
                "Embezzlement of cooperative funds for personal media business",
                "Citizenship fraud while holding public office",
                "Misuse of public office and authority",
            ],
            timeline=[
                {
                    "date": "2023-11-28",
                    "title": "Supreme Court orders citizenship investigation",
                    "description": "Supreme Court directs authorities to investigate citizenship irregularities",
                    "order": 1,
                },
                {
                    "date": "2024-01-18",
                    "title": "Arrested in cooperative fraud case",
                    "description": "Police arrest Lamichhane in connection with cooperative embezzlement",
                    "order": 2,
                },
            ],
            evidence=[
                {
                    "source_id": "source:20230520:coop001",
                    "description": "Police complaint filed by cooperative victims",
                    "order": 1,
                },
                {
                    "source_id": "source:20230520:testimony001",
                    "description": "Cooperative victims' testimonies and financial records",
                    "order": 2,
                },
            ],
            case_start_date=datetime(2023, 5, 18).date(),
            created_at=timezone.make_aware(datetime(2023, 5, 20)),
        )
        set_case_entities(
            rabi,
            alleged_ids=["entity:person/rabi-lamichhane"],
            related_ids=[
                "entity:organization/political_party/rastriya-swatantra-party"
            ],
            location_ids=["entity:location/district/chitwan"],
        )

        # 3. Melamchi
        melamchi = Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Melamchi Water Supply Project Delays and Cost Overruns",
            description="""<h1>Melamchi Water Supply Project Failure</h1>

<h2>Overview</h2>
<p>The Melamchi Water Supply Project, initiated in 1998 to solve Kathmandu Valley's water crisis, has faced decades of delays, massive cost overruns, and repeated failures.</p>

<h2>Timeline of Broken Trust</h2>
<ul>
<li><strong>1998</strong>: Project initiated with 5-year timeline</li>
<li><strong>2016</strong>: Finally inaugurated after 18 years</li>
<li><strong>2021</strong>: System damaged by floods</li>
<li><strong>2024</strong>: Still not fully operational</li>
</ul>

<h2>Financial Impact</h2>
<ul>
<li>Original budget: NPR 16 billion</li>
<li>Current cost: Over NPR 100 billion</li>
<li>Kathmandu residents still face severe water shortages</li>
</ul>

<h2>Breach of Public Trust</h2>
<p>Citizens were promised reliable water supply for over two decades, with multiple governments failing to deliver despite massive public investment.</p>""",
            key_allegations=[
                "26+ years of delays beyond original 5-year timeline",
                "Cost overrun from NPR 16B to NPR 100B+",
                "Failure to deliver promised water supply to Kathmandu Valley residents",
            ],
            timeline=[
                {
                    "date": "1998-06-01",
                    "title": "Project initiated",
                    "description": "Melamchi project officially launched with 5-year completion target",
                    "order": 1,
                },
                {
                    "date": "2021-06-15",
                    "title": "Flood damage halts operations",
                    "description": "Monsoon floods severely damage tunnel and infrastructure",
                    "order": 2,
                },
            ],
            evidence=[
                {
                    "source_id": "source:20200101:audit001",
                    "description": "Government audit reports showing cost escalations",
                    "order": 1,
                },
                {
                    "source_id": "source:20200101:media001",
                    "description": "News reports documenting repeated delays and failures",
                    "order": 2,
                },
            ],
            case_start_date=datetime(1998, 6, 1).date(),
            created_at=timezone.make_aware(datetime(2020, 1, 1)),
        )
        set_case_entities(
            melamchi,
            alleged_ids=[
                "entity:organization/government_body/nepal-government",
                "entity:organization/government_body/melamchi-water-supply-board",
            ],
            related_ids=[
                "entity:organization/government_body/ministry-of-water-supply"
            ],
            location_ids=["entity:location/district/kathmandu-valley"],
        )

        # 4. KP Oli
        oli = Case.objects.create(
            case_type=CaseType.PROMISES,
            state=CaseState.PUBLISHED,
            title="KP Sharma Oli's Unfulfilled 2017 Election Promises",
            description="""<h1>KP Sharma Oli's Broken Election Promises</h1>

<h2>Overview</h2>
<p>During the 2017 election campaign, KP Sharma Oli made several ambitious promises that remained unfulfilled during his tenure as Prime Minister.</p>

<h2>Key Broken Promises</h2>

<h3>1. Prosperity and Development</h3>
<p><strong>Promise</strong>: "We will make Nepal prosperous within 5 years"<br>
<strong>Reality</strong>: Nepal's economic indicators showed minimal improvement; poverty rates remained high</p>

<h3>2. Railway Connection</h3>
<p><strong>Promise</strong>: Railway connection to Kathmandu within his term<br>
<strong>Reality</strong>: No significant progress on railway infrastructure</p>

<h3>3. Employment</h3>
<p><strong>Promise</strong>: Create millions of jobs and stop youth migration<br>
<strong>Reality</strong>: Youth migration continued at high rates; unemployment remained a critical issue</p>

<h3>4. Corruption-Free Governance</h3>
<p><strong>Promise</strong>: Zero tolerance for corruption<br>
<strong>Reality</strong>: Multiple corruption scandals emerged during his tenure</p>""",
            key_allegations=[
                "Failed to deliver on prosperity promise within 5 years",
                "No railway connection to Kathmandu as promised",
                "Continued youth migration despite job creation promises",
                "Corruption scandals during tenure despite zero-tolerance promise",
            ],
            timeline=[
                {
                    "date": "2017-11-15",
                    "title": "Election campaign promises",
                    "description": "Oli makes ambitious promises during election rallies",
                    "order": 1,
                },
                {
                    "date": "2021-07-13",
                    "title": "End of tenure",
                    "description": "Oli's government falls; promises remain unfulfilled",
                    "order": 2,
                },
            ],
            evidence=[
                {
                    "source_id": "source:20210715:campaign001",
                    "description": "Video recordings of election campaign speeches",
                    "order": 1,
                },
                {
                    "source_id": "source:20210715:economic001",
                    "description": "Economic data showing lack of promised development",
                    "order": 2,
                },
            ],
            case_start_date=datetime(2017, 11, 15).date(),
            created_at=timezone.make_aware(datetime(2021, 7, 15)),
        )
        set_case_entities(
            oli,
            alleged_ids=["entity:person/kp-sharma-oli"],
            related_ids=[
                "entity:organization/political_party/nepal-communist-party",
                "entity:organization/government_body/nepal-government",
            ],
            location_ids=["entity:location/nepal"],
        )

        # 5. Media Trial
        media = Case.objects.create(
            case_type=CaseType.CORRUPTION,
            state=CaseState.PUBLISHED,
            title="Sandeep Lamichhane Case: Media Trial and Public Opinion",
            description="""<h1>Media Trial of Sandeep Lamichhane</h1>

<h2>Overview</h2>
<p>The rape case against cricketer Sandeep Lamichhane became subject to intense media coverage and public opinion formation before legal proceedings concluded.</p>

<h2>Media Conduct Issues</h2>

<h3>Premature Judgment</h3>
<p>Multiple media outlets published stories with presumptive language suggesting guilt before trial completion.</p>

<h3>Privacy Violations</h3>
<p>Details of the case, including sensitive information, were widely circulated on social media and news platforms.</p>

<h3>Trial by Social Media</h3>
<p>Public opinion was heavily influenced by media narratives rather than court proceedings, with both supporters and critics forming strong positions.</p>

<h2>Impact on Justice</h2>
<p>The intense media coverage raised concerns about:</p>
<ul>
<li>Fair trial rights</li>
<li>Presumption of innocence</li>
<li>Influence on judicial proceedings</li>
<li>Victim and accused privacy</li>
</ul>""",
            key_allegations=[
                "Extensive media coverage prejudicing fair trial",
                "Violation of privacy rights of parties involved",
                "Formation of public opinion before legal conclusion",
                "Sensationalized reporting influencing judicial proceedings",
            ],
            timeline=[
                {
                    "date": "2022-09-08",
                    "title": "Case becomes public",
                    "description": "Rape allegations against Lamichhane become public; media frenzy begins",
                    "order": 1,
                },
                {
                    "date": "2024-01-10",
                    "title": "Court verdict delivered",
                    "description": "District court delivers verdict after prolonged media coverage",
                    "order": 2,
                },
            ],
            evidence=[
                {
                    "source_id": "source:20220910:media001",
                    "description": "Collection of news articles with prejudicial language",
                    "order": 1,
                },
                {
                    "source_id": "source:20220910:ethics001",
                    "description": "Analysis by media ethics organizations",
                    "order": 2,
                },
            ],
            case_start_date=datetime(2022, 9, 8).date(),
            created_at=timezone.make_aware(datetime(2022, 9, 10)),
        )
        set_case_entities(
            media,
            alleged_ids=["entity:person/sandeep-lamichhane"],
            related_ids=[
                "entity:organization/political_party/national-independent-party"
            ],
            location_ids=["entity:location/district/kathmandu"],
        )

        self.stdout.write(self.style.SUCCESS("Successfully created:"))
        self.stdout.write(f"  - {JawafEntity.objects.count()} entities")
        self.stdout.write(f"  - {Case.objects.count()} cases")
        self.stdout.write(f"  - {DocumentSource.objects.count()} document sources")
