package com.MTA.V01.services.controllers;

import com.MTA.V01.models.Dose;
import com.MTA.V01.models.InAppMessage;
import com.MTA.V01.models.PastDoses;
import com.MTA.V01.models.User;
import com.MTA.V01.models.enumerations.EDoseStatus;
import com.MTA.V01.payload.requests.AddDoseRequest;
import com.MTA.V01.payload.requests.EditDoseRequest;
import com.MTA.V01.repositories.DoseRepository;
import com.MTA.V01.repositories.InAppMessagesRepository;
import com.MTA.V01.repositories.MedicineRepository;
import com.MTA.V01.repositories.PastDosesRepository;
import com.MTA.V01.repositories.enumRepos.DoseStatusRepository;
import com.MTA.V01.services.general.GeneralServices;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;



@Service
public class DoseServices {
    @Autowired
    DoseRepository doseRepository;

    @Autowired
    DoseStatusRepository doseStatusRepository;

    @Autowired
    PastDosesRepository pastDosesRepository;

    @Autowired
    MedicineRepository medicineRepository;

    @Autowired
    GeneralServices generalServices;

    @Autowired
    LogServices logServices;
    @Autowired
    private InAppMessagesRepository inAppMessagesRepository;

    public ResponseEntity<?> addDose(AddDoseRequest addDoseRequest){

        if(!medicineRepository.existsById(addDoseRequest.getMedicineId())){
            return ResponseEntity.badRequest().body("Medicine with id "+addDoseRequest.getMedicineId()+" Does not exist");
        }

        if (addDoseRequest.getDayOfWeek().size()!=addDoseRequest.getLocalTime().size() || addDoseRequest.getLocalTime().size()!=addDoseRequest.getDoseInMilligram().size()){
            return ResponseEntity.badRequest().body("data incomplete, please check that you're sending the full data");
        }

        if (addDoseRequest.getStartDate().isAfter(addDoseRequest.getEndDate())){
            return ResponseEntity.badRequest().body("starting date is after the ending date");
        }

        if (addDoseRequest.getEndDate().isBefore(LocalDate.now())){
            return ResponseEntity.badRequest().body("dose end date is before today");
        }

        String simpleDoseIdentifier = RandomStringUtils.insecure().nextAlphanumeric(8).toUpperCase();

        if (addDoseRequest.getSimpleDoseIdentifier()!=null){
            simpleDoseIdentifier = addDoseRequest.getSimpleDoseIdentifier();
        }

        //if no end date is specified. Will make as many doses as there are days in a week in a request
        //if(addDoseRequest.getEndDate()==null){
            for (int counter = 0; counter<addDoseRequest.getDoseInMilligram().size(); counter++){
                Dose dose = new Dose(
                        addDoseRequest.getName(),
                        addDoseRequest.getDayOfWeek().get(counter),
                        addDoseRequest.getLocalTime().get(counter),
                        addDoseRequest.getDoseInMilligram().get(counter)
                );
                dose.setMedicine(medicineRepository.findById(addDoseRequest.getMedicineId()).get());
                dose.setUser(generalServices.getSelf());
                dose.setStartDate(addDoseRequest.getStartDate());
                dose.setEndDate(addDoseRequest.getEndDate());
                dose.setDoseSimpleIdentifier(simpleDoseIdentifier);
                dose.setIsActive(true);
                dose.setAddedBy(generalServices.getSelf());
                logServices.addLog("user "+generalServices.getSelf()+" added dose "+dose);
                doseRepository.save(dose);
            }
            return ResponseEntity.ok("saved doses successfully");
        //}

        //for making a lot of doses in a specified set of time

        /*
        LocalDate currentDate = addDoseRequest.getStartDate();

        while(!currentDate.isAfter(addDoseRequest.getEndDate())){
            DayOfWeek currentDayOfWeek = currentDate.getDayOfWeek();

            for(int counter = 0;counter<addDoseRequest.getDoseInMilligram().size();counter++){
                if (addDoseRequest.getDayOfWeek().get(counter)==currentDayOfWeek){
                    Dose dose = new Dose(
                            addDoseRequest.getName(),
                            addDoseRequest.getDayOfWeek().get(counter),
                            addDoseRequest.getLocalTime().get(counter),
                            addDoseRequest.getDoseInMilligram().get(counter)
                    );
                    dose.setMedicine(medicineRepository.findById(addDoseRequest.getMedicineId()).get());
                    dose.setUser(generalServices.getSelf());
                    dose.setStartDate(addDoseRequest.getStartDate());
                    dose.setEndDate(addDoseRequest.getEndDate());
                    dose.setDoseDate(currentDate);
                    logServices.addLog("user "+generalServices.getSelf()+" added dose "+dose);
                    doseRepository.save(dose);
                }
            }
            currentDate = currentDate.plusDays(1);
        }*/
    }

    public ResponseEntity<?> editDose(Long doseId,EditDoseRequest request){

        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with id "+doseId+" does not exist");
        }
        Dose current = doseRepository.findById(doseId).get();
        User self = generalServices.getSelf();

        if (!current.getUser().getId().equals(self.getId())){
            return ResponseEntity.badRequest().body("not authorized to edit this dose");
        }

        if(!medicineRepository.existsById(request.getMedicineId())){
            return ResponseEntity.badRequest().body("medicine with id "+request.getMedicineId()+" does not exist");
        }

        current.setName(request.getName());
        current.setDoseDay(request.getDayOfWeek());
        current.setLocalTime(request.getLocalTime());
        current.setDoseInMilligram(request.getDoseInMilligram());
        current.setMedicine(medicineRepository.findById(request.getMedicineId()).get());
        current.setIsActive(true);

        logServices.updateLog("user "+generalServices.getSelf()+" updated dose "+ current);
        doseRepository.save(current);
        return ResponseEntity.ok("updated Dose successfully");
    }

    public ResponseEntity<?> deleteDose(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with dose id "+doseId+" Dose not exist");
        }
        if (!doseRepository.findById(doseId).get().getUser().getId().equals(generalServices.getSelf().getId())){
            return ResponseEntity.badRequest().body("Not authorized to delete this dose");
        }

        logServices.deleteLog("user "+generalServices.getSelf()+" deleted dose "+doseRepository.findById(doseId));
        doseRepository.deleteById(doseId);
        return ResponseEntity.ok("successfully deleted dose");
    }

    public ResponseEntity<?> massDeleteDoses(String simpleDoseIdentifier){
        List<Dose> doses = generalServices.getSelf().getDoses();

        logServices.deleteLog("user "+generalServices.getSelf()+" deleted doses "+doses);
        doses.forEach(dose -> {
            if (dose.getDoseSimpleIdentifier().equals(simpleDoseIdentifier)){
                logServices.deleteLog("deleted dose from user" + generalServices.getSelf()+" where simple dose identifier = "+simpleDoseIdentifier);
                doseRepository.delete(dose);
            }
        });
        return ResponseEntity.ok("deleted all instances of "+simpleDoseIdentifier);
    }

    public ResponseEntity<?> findAllDoses(){
        return ResponseEntity.ok(generalServices.getSelf().getDoses());
    }

    public ResponseEntity<?> findAllActiveDoses(){
        return ResponseEntity.ok(doseRepository.findByIsActiveTrueAndUser(generalServices.getSelf()));
    }

    public ResponseEntity<?> search(String name){
        return ResponseEntity.ok(doseRepository.findByNameContainsIgnoreCaseAndUser_Id(name, generalServices.getSelf().getId()));
    }

    public ResponseEntity<?> takeDose(Long doseId){
        if(!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with id "+doseId+" doesn't exist");
        }

        Dose dose = doseRepository.findById(doseId).get();
        User self = generalServices.getSelf();

        if (!dose.getUser().getId().equals(self.getId())){
            return ResponseEntity.badRequest().body("user not authorized to change the dose status");
        }



        LocalTime localTime= LocalTime.now();

        LocalDate today = LocalDate.now();

        LocalDate nextDayOccurrence = today.with(TemporalAdjusters.nextOrSame(dose.getDoseDay()));
        LocalDate previousDayOccurrence = today.with(TemporalAdjusters.previousOrSame(dose.getDoseDay()));

        long daysUntilNext = ChronoUnit.DAYS.between(today,nextDayOccurrence);
        long daysSincePrev = ChronoUnit.DAYS.between(previousDayOccurrence,today);

        LocalDate doseDate = daysUntilNext <= daysSincePrev ? nextDayOccurrence:previousDayOccurrence;


        //Grace period for the time in minutes.
        long grace = 15;




        //Taken early by day
        if (doseDate.isAfter(today)){
            PastDoses pastdose = new PastDoses(dose,self);


            pastdose.setDate(LocalDateTime.now());
            pastdose.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN_EARLY).get());


            pastDosesRepository.save(pastdose);
            inAppMessageService(dose);
            return ResponseEntity.ok("dose successfully taken and marked as TAKEN EARLY");
        }

        //Taken late by day
        if (doseDate.isBefore(today)){
            PastDoses pastdose = new PastDoses(dose,self);

            pastdose.setDate(LocalDateTime.now());
            pastdose.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN_LATE).get());

            pastDosesRepository.save(pastdose);
            inAppMessageService(dose);
            return ResponseEntity.ok("dose successfully taken and marked as TAKEN LATE");
        }


        //Taken early by time
        if (localTime.isBefore(dose.getLocalTime().minusMinutes(grace))){
            PastDoses pastDose = new PastDoses(dose,self);

            pastDose.setDate(LocalDateTime.now());
            pastDose.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN_EARLY).get());

            pastDosesRepository.save(pastDose);
            inAppMessageService(dose);
            return ResponseEntity.ok("dose successfully taken and marked as TAKEN EARLY");
        }

        //Taken late by time
        if (localTime.isAfter(dose.getLocalTime().plusMinutes(grace))){
            PastDoses pastDose = new PastDoses(dose,self);

            pastDose.setDate(LocalDateTime.now());
            pastDose.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN_LATE).get());

            pastDosesRepository.save(pastDose);
            inAppMessageService(dose);
            return ResponseEntity.ok("dose successfully taken and marked as TAKEN LATE");
        }

        PastDoses pastDose = new PastDoses(dose, self);

        pastDose.setDate(LocalDateTime.now());
        pastDose.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN).get());

        pastDosesRepository.save(pastDose);

        inAppMessageService(dose);

        return ResponseEntity.ok("dose successfully taken and marked as TAKEN");
    }

    public ResponseEntity<?> takeEarly(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with dose id "+doseId+" does not exist");
        }
        User self = generalServices.getSelf();
        Dose dose = doseRepository.findById(doseId).get();
        if (!self.getId().equals(dose.getUser().getId())){
            return ResponseEntity.badRequest().body("not authorized to view this resource");
        }
        PastDoses pastDoses = new PastDoses(dose,self);
        pastDoses.setDate(LocalDateTime.now());
        pastDoses.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN_EARLY).get());
        pastDosesRepository.save(pastDoses);

        inAppMessageService(dose);
        return ResponseEntity.ok("dose taken as taken early");

    }

    public ResponseEntity<?> takeLate(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with dose id "+doseId+" does not exist");
        }
        User self = generalServices.getSelf();
        Dose dose = doseRepository.findById(doseId).get();
        if (!self.getId().equals(dose.getUser().getId())){
            return ResponseEntity.badRequest().body("not authorized to view this resource");
        }
        PastDoses pastDoses = new PastDoses(dose,self);
        pastDoses.setDate(LocalDateTime.now());
        pastDoses.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN_LATE).get());
        pastDosesRepository.save(pastDoses);

        inAppMessageService(dose);
        return ResponseEntity.ok("dose taken as taken late");

    }

    public ResponseEntity<?> take(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with dose id "+doseId+" does not exist");
        }
        User self = generalServices.getSelf();
        Dose dose = doseRepository.findById(doseId).get();
        if (!self.getId().equals(dose.getUser().getId())){
            return ResponseEntity.badRequest().body("not authorized to view this resource");
        }
        PastDoses pastDoses = new PastDoses(dose,self);
        pastDoses.setDate(LocalDateTime.now());
        pastDoses.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.TAKEN).get());
        pastDosesRepository.save(pastDoses);

        inAppMessageService(dose);
        return ResponseEntity.ok("dose taken as taken");

    }

    public ResponseEntity<?> miss(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with dose id "+doseId+" does not exist");
        }
        User self = generalServices.getSelf();
        Dose dose = doseRepository.findById(doseId).get();
        if (!self.getId().equals(dose.getUser().getId())){
            return ResponseEntity.badRequest().body("not authorized to view this resource");
        }
        PastDoses pastDoses = new PastDoses(dose,self);
        pastDoses.setDate(LocalDateTime.now());
        pastDoses.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.MISSED).get());
        pastDosesRepository.save(pastDoses);

        inAppMessageService(dose);
        return ResponseEntity.ok("dose marked as missed");

    }

    public ResponseEntity<?> overdosed(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with dose id "+doseId+" does not exist");
        }
        User self = generalServices.getSelf();
        Dose dose = doseRepository.findById(doseId).get();
        if (!self.getId().equals(dose.getUser().getId())){
            return ResponseEntity.badRequest().body("not authorized to view this resource");
        }
        PastDoses pastDoses = new PastDoses(dose,self);
        pastDoses.setDate(LocalDateTime.now());
        pastDoses.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.OVERDOSED).get());
        pastDosesRepository.save(pastDoses);

        inAppMessageService(dose);
        return ResponseEntity.ok("dose taken as overdosed");

    }

    public ResponseEntity<?> skipDose(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with dose ID "+doseId+" doesn't exist");
        }
        Dose dose = doseRepository.findById(doseId).get();

        PastDoses pastDoses = new PastDoses(dose,dose.getUser());
        pastDoses.setDoseStatus(doseStatusRepository.findByName(EDoseStatus.SKIPPED).get());
        pastDoses.setDate(LocalDateTime.now());
        pastDosesRepository.save(pastDoses);

        inAppMessageService(dose);

        return ResponseEntity.ok("skipped dose");
    }

    public ResponseEntity<?> findDoseById(Long doseId){
        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with the given ID doesn't exist");
        }
        return ResponseEntity.ok(doseRepository.findById(doseId));
    }

    public ResponseEntity<?> deactivateDose(String doseSimpleIdentifier){
        if (!doseRepository.existsByDoseSimpleIdentifier(doseSimpleIdentifier.toUpperCase())){
            return ResponseEntity.badRequest().body("doses with dose simple identifier "+doseSimpleIdentifier+" does not exist");
        }
        List<Dose> doses = doseRepository.findByDoseSimpleIdentifier(doseSimpleIdentifier.toUpperCase());
        doses.forEach(dose -> {
            dose.setIsActive(false);
            doseRepository.save(dose);
        });
        return ResponseEntity.ok("Deactivated "+doses.size()+" doses successfully");
    }
    // Doctor Section

    public ResponseEntity<?> addUserDoses(Long userId, AddDoseRequest addDoseRequest){
        if (generalServices.getUser(userId)==null){
            return ResponseEntity.badRequest().body("user doesn't exist");
        }

        if(!medicineRepository.existsById(addDoseRequest.getMedicineId())){
            return ResponseEntity.badRequest().body("Medicine with id "+addDoseRequest.getMedicineId()+" Does not exist");
        }

        if (!generalServices.getUser(userId).getDoctors().contains(generalServices.getSelf())){
            return ResponseEntity.badRequest().body("not authorized to change the user's doses");
        }

        if (addDoseRequest.getDayOfWeek().size()!=addDoseRequest.getLocalTime().size() || addDoseRequest.getLocalTime().size()!=addDoseRequest.getDoseInMilligram().size()){
            return ResponseEntity.badRequest().body("data incomplete, please check that you're sending the full data");
        }

        if (addDoseRequest.getStartDate().isAfter(addDoseRequest.getEndDate())){
            return ResponseEntity.badRequest().body("starting date is after the ending date");
        }

        if (addDoseRequest.getEndDate().isBefore(LocalDate.now())){
            return ResponseEntity.badRequest().body("dose end date is before today");
        }

        String simpleDoseIdentifier = RandomStringUtils.insecure().nextAlphanumeric(8).toUpperCase();
        //if no end date is specified. Will make as many doses as there are days in a week in a request
        //if(addDoseRequest.getEndDate()==null){
        for (int counter = 0; counter<addDoseRequest.getDoseInMilligram().size(); counter++){
            Dose dose = new Dose(
                    addDoseRequest.getName(),
                    addDoseRequest.getDayOfWeek().get(counter),
                    addDoseRequest.getLocalTime().get(counter),
                    addDoseRequest.getDoseInMilligram().get(counter)
            );
            dose.setMedicine(medicineRepository.findById(addDoseRequest.getMedicineId()).get());
            dose.setUser(generalServices.getUser(userId));
            dose.setStartDate(addDoseRequest.getStartDate());
            dose.setEndDate(addDoseRequest.getEndDate());
            dose.setDoseSimpleIdentifier(simpleDoseIdentifier);
            dose.setIsActive(true);
            dose.setAddedBy(generalServices.getSelf());
            logServices.addLog("user "+generalServices.getSelf()+" added dose "+dose);
            doseRepository.save(dose);
        }
        return ResponseEntity.ok("saved doses successfully");
        //}

        //for making a lot of doses in a specified set of time

        /*
        LocalDate currentDate = addDoseRequest.getStartDate();

        while(!currentDate.isAfter(addDoseRequest.getEndDate())){
            DayOfWeek currentDayOfWeek = currentDate.getDayOfWeek();

            for(int counter = 0;counter<addDoseRequest.getDoseInMilligram().size();counter++){
                if (addDoseRequest.getDayOfWeek().get(counter)==currentDayOfWeek){
                    Dose dose = new Dose(
                            addDoseRequest.getName(),
                            addDoseRequest.getDayOfWeek().get(counter),
                            addDoseRequest.getLocalTime().get(counter),
                            addDoseRequest.getDoseInMilligram().get(counter)
                    );
                    dose.setMedicine(medicineRepository.findById(addDoseRequest.getMedicineId()).get());
                    dose.setUser(generalServices.getSelf());
                    dose.setStartDate(addDoseRequest.getStartDate());
                    dose.setEndDate(addDoseRequest.getEndDate());
                    dose.setDoseDate(currentDate);
                    logServices.addLog("user "+generalServices.getSelf()+" added dose "+dose);
                    doseRepository.save(dose);
                }
            }
            currentDate = currentDate.plusDays(1);
        }*/
    }

    public ResponseEntity<?> editUserDose(Long doseId, EditDoseRequest request){

        if (!doseRepository.existsById(doseId)){
            return ResponseEntity.badRequest().body("dose with id "+doseId+" does not exist");
        }

        if(!medicineRepository.existsById(request.getMedicineId())){
            return ResponseEntity.badRequest().body("medicine with id "+request.getMedicineId()+" does not exist");
        }

        if (!doseRepository.findById(doseId).get().getUser().getDoctors().contains(generalServices.getSelf())){
            return ResponseEntity.badRequest().body("Not authorized to change this data");
        }

        Dose dose = new Dose(
                request.getName(),
                request.getDayOfWeek(),
                request.getLocalTime(),
                request.getDoseInMilligram()
        );
        dose.setId(doseId);
        dose.setUser(generalServices.getSelf());
        dose.setMedicine(medicineRepository.findById(request.getMedicineId()).get());

        logServices.updateLog("user "+generalServices.getSelf()+" updated dose "+ dose);
        doseRepository.save(dose);
        return ResponseEntity.ok("updated Dose successfully");
    }


    //TODO should show once per entire page change? idk
    private void inAppMessageService(Dose dose){

        Pageable limit = PageRequest.of(0,5);
        List<PastDoses> pastFiveDoses = pastDosesRepository.findByDose_DoseSimpleIdentifierAndUser_IdOrderByDateDesc(dose.getDoseSimpleIdentifier(),generalServices.getSelf().getId(),limit);
        if (pastFiveDoses.size()==5){

            int counter = 0;


            for (PastDoses pastFiveDose : pastFiveDoses) {
                if (!pastFiveDose.getDoseStatus().equals(doseStatusRepository.findByName(EDoseStatus.TAKEN).get())) {
                    counter = counter + 1;
                }
            }

            if (counter>2){
                InAppMessage inAppMessage = new InAppMessage("You haven't been taking your doses for doses "+dose.getName()+" on time, consider changing the time");
                inAppMessage.setUser(generalServices.getSelf());
                inAppMessage.setTimeCreated(LocalDateTime.now());
                inAppMessage.setRead(false);
                inAppMessagesRepository.save(inAppMessage);
            }
        }

    }
}
